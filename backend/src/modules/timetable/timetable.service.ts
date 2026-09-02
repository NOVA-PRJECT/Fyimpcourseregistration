import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import * as fs from 'fs'
import * as path from 'path'
import { SupabaseService } from '../../core/database/supabase.service'
import { AuditLoggerService, AuditEvents } from '../../core/logging/audit-logger.service'
import { ServerLoggerService } from '../../core/logging/server-logger.service'
import { AuthUser } from '../../core/auth/types'
import { runGenerationJob } from './solver/job'
import { getRedisClient } from './solver/redisClient'

const CONSTRAINTS_PATH = path.join(__dirname, 'solver/constraints.base.json')

@Injectable()
export class TimetableService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly auditLogger: AuditLoggerService,
    private readonly serverLogger: ServerLoggerService,
  ) {}

  private readConstraintsFile() {
    try {
      if (fs.existsSync(CONSTRAINTS_PATH)) {
        return JSON.parse(fs.readFileSync(CONSTRAINTS_PATH, 'utf8'))
      }
    } catch (err) {
      console.error('Error reading constraints file:', err)
    }
    return {
      schedule: {},
      hard_constraints: [],
      soft_constraints: [],
      semester_constraints: {},
    }
  }

  // ──────────────── Constraints ────────────────
  async getConstraints(semester: string | undefined) {
    const raw = this.readConstraintsFile()
    const semKey = semester ? String(semester) : null
    const semSpecific = semKey && raw.semester_constraints?.[semKey] ? raw.semester_constraints[semKey] : null

    const universalHard = raw.hard_constraints || []
    const universalSoft = raw.soft_constraints || []
    const semHard = semSpecific?.hard_constraints || []
    const semSoft = semSpecific?.soft_constraints || []

    return {
      schedule: raw.schedule,
      universal_hard_constraints: universalHard,
      universal_soft_constraints: universalSoft,
      semester_constraints: raw.semester_constraints || {},
      hard_constraints: [...universalHard, ...semHard],
      soft_constraints: [...universalSoft, ...semSoft],
      selected_semester_hard: semHard,
      selected_semester_soft: semSoft,
    }
  }

  async updateConstraints(body: any) {
    const current = this.readConstraintsFile()
    const updated = {
      schedule: body.schedule || current.schedule,
      hard_constraints: Array.isArray(body.universal_hard_constraints)
        ? body.universal_hard_constraints
        : Array.isArray(body.hard_constraints)
        ? body.hard_constraints
        : current.hard_constraints,
      soft_constraints: Array.isArray(body.universal_soft_constraints)
        ? body.universal_soft_constraints
        : Array.isArray(body.soft_constraints)
        ? body.soft_constraints
        : current.soft_constraints,
      semester_constraints: body.semester_constraints || current.semester_constraints,
    }

    try {
      fs.writeFileSync(CONSTRAINTS_PATH, JSON.stringify(updated, null, 2), 'utf8')
      return { success: true, message: 'Constraints updated successfully', constraints: updated }
    } catch (err: any) {
      throw new InternalServerErrorException(`Failed to save constraints: ${err.message}`)
    }
  }

  // ──────────────── Entries ────────────────
  async getEntries(academicYear: string, semester: number, departmentId: string | undefined, user: AuthUser) {
    let campusDeptIds: string[] = []
    if (user.campus_id) {
      const { data: depts } = await this.supabase.admin
        .from('departments')
        .select('id')
        .eq('campus_id', user.campus_id)
      campusDeptIds = (depts || []).map((d: any) => d.id)
    }

    let deptsFetchQuery = this.supabase.admin.from('departments').select('id, name, code').order('name')
    if (user.campus_id && campusDeptIds.length > 0) {
      deptsFetchQuery = deptsFetchQuery.in('id', campusDeptIds)
    }
    const { data: allDepartmentsData } = await deptsFetchQuery

    let query = this.supabase.admin
      .from('timetable_entries')
      .select(`
        id,
        academic_year,
        semester,
        time_slot_id,
        department_id,
        is_lab_block,
        status,
        session_type,
        time_slots (
          id,
          day_of_week,
          period_number
        ),
        courses (
          id,
          course_code,
          title,
          category,
          tag,
          credits,
          department_id
        )
      `)
      .eq('academic_year', academicYear)
      .eq('semester', semester)

    if (departmentId) {
      query = query.eq('department_id', departmentId)
    } else if (user.campus_id && campusDeptIds.length > 0) {
      query = query.in('department_id', campusDeptIds)
    }

    const { data: entries, error } = await query

    if (error) {
      console.error('[Timetable getEntries error]', error)
      throw new InternalServerErrorException('Failed to fetch timetable entries')
    }

    const formattedEntries = (entries || []).map((entry: any) => ({
      id: entry.id,
      day: entry.time_slots?.day_of_week,
      period: entry.time_slots?.period_number,
      slotId: entry.time_slot_id,
      departmentId: entry.department_id,
      courseId: entry.courses?.id,
      courseCode: entry.courses?.course_code,
      courseName: entry.courses?.title,
      category: entry.courses?.category,
      tag: entry.courses?.tag,
      credits: entry.courses?.credits,
      isLabBlock: entry.is_lab_block,
      status: entry.status,
    }))

    return {
      academicYear,
      semester,
      departments: allDepartmentsData || [],
      entries: formattedEntries,
    }
  }

  // ──────────────── Generate ────────────────
  async generate(academicYear: string, semester: number, dynamicConstraints: any[] | undefined, user: AuthUser) {
    const { data: regWindow } = await this.supabase.admin
      .from('registration_windows')
      .select('is_closed')
      .eq('academic_year', academicYear)
      .eq('semester', semester)
      .maybeSingle()

    if (regWindow && !regWindow.is_closed) {
      throw new BadRequestException('Registration window is still open for this semester. Close registrations before generating timetable.')
    }

    let jobQuery = this.supabase.admin
      .from('timetable_generation_jobs')
      .select('id, status')
      .eq('academic_year', academicYear)
      .eq('semester', semester)
      .in('status', ['queued', 'running'])

    if (user.campus_id) {
      jobQuery = jobQuery.eq('campus_id', user.campus_id)
    }

    const { data: existingJob } = await jobQuery.maybeSingle()
    if (existingJob) {
      throw new BadRequestException('A timetable generation job is already running for this semester.')
    }

    const { data: newJob, error: insertError } = await this.supabase.admin
      .from('timetable_generation_jobs')
      .insert({
        academic_year: academicYear,
        semester,
        campus_id: user.campus_id ?? null,
        status: 'queued',
        progress: 0,
        triggered_by: user.userId,
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (insertError || !newJob) {
      throw new InternalServerErrorException(`Could not start generation job: ${insertError?.message || 'Database insert failed'}`)
    }

    const redis = getRedisClient()

    // Run the background generation job
    runGenerationJob(
      newJob.id,
      academicYear,
      semester,
      user.userId,
      this.supabase.admin,
      redis,
      user.campus_id ?? undefined,
      dynamicConstraints || [],
    ).catch((err) => console.error('Background generation job error:', err))

    await this.auditLogger.log({
      eventType: AuditEvents.TIMETABLE_GENERATED,
      userId: user.userId,
      userRole: user.role,
      action: `initiated timetable generation for ${academicYear} sem ${semester}`,
      resourceType: 'timetable',
      status: 'success',
      metadata: { academicYear, semester, campusId: user.campus_id },
    })

    return {
      success: true,
      jobId: newJob.id,
      status: 'queued',
      message: 'Timetable generation job initiated',
      academicYear,
      semester,
    }
  }

  // ──────────────── Job Status ────────────────
  async getJobStatus(academicYear: string, semester: number, user: AuthUser) {
    const redisKey = `timetable:job:${academicYear}:${semester}${user.campus_id ? `:${user.campus_id}` : ''}`
    const redis = getRedisClient()

    try {
      const cached = await redis.get(redisKey)
      if (cached) {
        const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached
        return {
          status: parsed.status,
          progress: parsed.progress || 0,
          jobId: parsed.jobId || null,
          errorMessage: parsed.errorMessage || parsed.error || null,
          stepMessage: parsed.stepMessage || null,
          stats: parsed.stats || null,
        }
      }
    } catch {
      // Fall through to DB
    }

    let query = this.supabase.admin
      .from('timetable_generation_jobs')
      .select('id, status, progress, error_message, created_at')
      .eq('academic_year', academicYear)
      .eq('semester', semester)
      .order('created_at', { ascending: false })
      .limit(1)

    if (user.campus_id) {
      query = query.eq('campus_id', user.campus_id)
    }

    const { data: job } = await query.maybeSingle()

    if (!job) {
      return { status: 'idle', progress: 0, jobId: null }
    }

    return {
      status: job.status,
      progress: job.progress,
      jobId: job.id,
      errorMessage: job.error_message,
    }
  }

  // ──────────────── Publish ────────────────
  async publish(academicYear: string, semester: number, user: AuthUser) {
    let campusDeptIds: string[] = []
    if (user.campus_id) {
      const { data: depts } = await this.supabase.admin
        .from('departments')
        .select('id')
        .eq('campus_id', user.campus_id)
      campusDeptIds = (depts || []).map((d: any) => d.id)
    }

    let conflictQuery = this.supabase.admin
      .from('timetable_conflicts')
      .select('id, course_id, reason, conflicting_student_count, courses(id, title, department_id)')
      .eq('academic_year', academicYear)
      .eq('semester', semester)
      .eq('resolved', false)

    if (user.campus_id && campusDeptIds.length > 0) {
      conflictQuery = conflictQuery.in('courses.department_id', campusDeptIds)
    }

    const { data: conflicts } = await conflictQuery

    if (conflicts && conflicts.length > 0) {
      throw new UnprocessableEntityException({
        error: 'Cannot publish timetable while unresolved conflicts exist',
        conflicts: conflicts.map((c: any) => ({
          courseId: c.course_id,
          courseName: c.courses?.title || 'Unknown',
          reason: c.reason,
          conflictingStudentCount: c.conflicting_student_count || 0,
        })),
      })
    }

    const nowIso = new Date().toISOString()
    let updateQuery = this.supabase.admin
      .from('timetable_entries')
      .update({
        status: 'published',
        published_at: nowIso,
      })
      .eq('academic_year', academicYear)
      .eq('semester', semester)
      .eq('status', 'draft')

    if (user.campus_id && campusDeptIds.length > 0) {
      updateQuery = updateQuery.in('department_id', campusDeptIds)
    }

    const { error: updateErr } = await updateQuery
    if (updateErr) throw new InternalServerErrorException('Failed to publish timetable entries')

    await this.auditLogger.log({
      eventType: AuditEvents.TIMETABLE_PUBLISHED,
      userId: user.userId,
      userRole: user.role,
      action: `published timetable for ${academicYear} sem ${semester}`,
      resourceType: 'timetable',
      status: 'success',
      metadata: { academicYear, semester },
    })

    return {
      success: true,
      message: 'Timetable published successfully',
      publishedAt: nowIso,
    }
  }
}
