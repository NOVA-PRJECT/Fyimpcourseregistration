import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common'
import { SupabaseService } from '../../core/database/supabase.service'
import { AuditLoggerService, AuditEvents } from '../../core/logging/audit-logger.service'
import { ServerLoggerService } from '../../core/logging/server-logger.service'
import { AuthUser } from '../../core/auth/types'
import { SLOT_RULES } from '../../core/constants/courseCategories'
import { Pathway, PathwaySlot } from '../../core/types/course.types'
import { isCourseEligibleForSlot } from '../../core/utils/slotRules'

@Injectable()
export class RegistrationsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly auditLogger: AuditLoggerService,
    private readonly serverLogger: ServerLoggerService,
  ) {}

  async resolvePathwaySlots(
    pathway: Pathway,
    user: AuthUser,
    deptMap: Map<string, string>,
    deptIdToName: Map<string, string>,
  ) {
    const slotsInfo = pathway.slots
      .map((s: PathwaySlot, i: number) => ({
        slot: i + 1,
        rule: s.rule,
        target: s.target,
        name: s.name ?? `Paper ${i + 1}`,
      }))
      .filter((s) => s.rule && s.target)

    if (slotsInfo.length === 0) {
      throw new BadRequestException('Pathway has no configured course slots')
    }

    const fixedTargets = slotsInfo
      .filter(
        (s) =>
          s.rule === SLOT_RULES.FIXED ||
          s.rule === SLOT_RULES.AEC_ELECT ||
          s.rule === SLOT_RULES.CAMPUS_FIXED,
      )
      .map((s) => s.target)

    let fixedCourseIds: string[] = []
    let fixedCoursesMap: Record<string, any> = {}

    if (fixedTargets.length > 0) {
      const { data: fixedCourses } = await this.supabase.admin
        .from('courses')
        .select('id, course_code, title, department_id, semester, credits, category, tag')
        .in('course_code', fixedTargets)

      if (fixedCourses) {
        fixedCourseIds = fixedCourses.map((c) => c.id)
        fixedCoursesMap = Object.fromEntries(fixedCourses.map((c) => [c.course_code, c]))
      }
    }

    const resolvedSlots = await Promise.all(
      slotsInfo.map(async ({ slot, rule, target, name }) => {
        if (
          rule === SLOT_RULES.FIXED ||
          rule === SLOT_RULES.AEC_ELECT ||
          rule === SLOT_RULES.CAMPUS_FIXED
        ) {
          const c = fixedCoursesMap[target]
          return {
            slot,
            rule,
            name,
            course: c
              ? {
                  ...c,
                  department_name: deptIdToName.get(c.department_id) || 'Unknown',
                }
              : undefined,
          }
        }

        let query = this.supabase.admin
          .from('courses')
          .select('id, course_code, title, department_id, semester, credits, category, tag')

        if (fixedCourseIds.length > 0) {
          query = query.not('id', 'in', `(${fixedCourseIds.join(',')})`)
        }

        if (rule === SLOT_RULES.DEPT_RESTRICTED) {
          const deptCodes = ((target as string) ?? '').split(',').map((code: string) => code.trim())
          const deptIds = deptCodes
            .map((code: string) => deptMap.get(code))
            .filter((id): id is string => id !== undefined)
          if (deptIds.length === 0) return { slot, rule, name, options: [] }
          const { data: options } = await query
            .in('department_id', deptIds)
            .eq('semester', user.current_semester)
            .in('category', ['DSC', 'DSE'])

          const filtered = (options ?? []).filter((c) =>
            isCourseEligibleForSlot(c, rule, target, user.department_id ?? '', deptMap),
          )
          const mapped = filtered.map((c) => ({
            ...c,
            department_name: deptIdToName.get(c.department_id) || 'Unknown',
          }))
          return { slot, rule, name, options: mapped }
        }

        if (rule === SLOT_RULES.EXCLUDE_DEPT) {
          const deptCodes = ((target as string) ?? '').split(',').map((code: string) => code.trim())
          const deptIds = deptCodes
            .map((code: string) => deptMap.get(code))
            .filter((id): id is string => id !== undefined)
          if (deptIds.length === 0) return { slot, rule, name, options: [] }
          const { data: options } = await query
            .not('department_id', 'in', `(${deptIds.join(',')})`)
            .eq('semester', user.current_semester)
            .eq('category', 'MDC')

          const filtered = (options ?? []).filter((c) =>
            isCourseEligibleForSlot(c, rule, target, user.department_id ?? '', deptMap),
          )
          const mapped = filtered.map((c) => ({
            ...c,
            department_name: deptIdToName.get(c.department_id) || 'Unknown',
          }))
          return { slot, rule, name, options: mapped }
        }

        // POOL_RESTRICTED — own department by tag
        if (rule === SLOT_RULES.POOL_RESTRICTED) {
          const { data: options } = await query
            .eq('department_id', user.department_id)
            .eq('tag', target)
            .eq('semester', user.current_semester)

          const filtered = (options ?? []).filter((c) =>
            isCourseEligibleForSlot(c, rule, target, user.department_id ?? '', deptMap),
          )
          const mapped = filtered.map((c) => ({
            ...c,
            department_name: deptIdToName.get(c.department_id) || 'Unknown',
          }))
          return { slot, rule, name, options: mapped }
        }

        // GLOBAL_BASKET — other departments by tag
        if (rule === SLOT_RULES.GLOBAL_BASKET) {
          let q = query.eq('tag', target).eq('semester', user.current_semester)
          if (target.includes('MDC')) {
            q = q.neq('department_id', user.department_id)
          }
          const { data: options } = await q
          const filtered = (options ?? []).filter((c) =>
            isCourseEligibleForSlot(c, rule, target, user.department_id ?? '', deptMap),
          )
          const mapped = filtered.map((c) => ({
            ...c,
            department_name: deptIdToName.get(c.department_id) || 'Unknown',
          }))
          return { slot, rule, name, options: mapped }
        }

        return { slot, rule, name, options: [] }
      }),
    )

    return resolvedSlots
  }

  async getBlueprint(user: AuthUser) {
    const campusId = user.campus_id
    const departmentId = user.department_id
    const semester = user.current_semester

    if (!campusId || !departmentId || !semester) {
      throw new BadRequestException('Student academic profile incomplete')
    }

    const [settingsRes, blueprintRes, deptRes] = await Promise.all([
      this.supabase.admin
        .from('campus_settings')
        .select('deadline, min_credits, max_credits, academic_year')
        .eq('campus_id', campusId)
        .single(),
      this.supabase.admin
        .from('semester_blueprints')
        .select('*')
        .eq('department_id', departmentId)
        .eq('semester', semester)
        .single(),
      this.supabase.admin.from('departments').select('id, name, code'),
    ])

    if (settingsRes.error || !settingsRes.data) {
      throw new NotFoundException('Campus settings not configured')
    }
    if (blueprintRes.error || !blueprintRes.data) {
      throw new NotFoundException('No blueprint configured for your semester')
    }

    const settings = settingsRes.data
    const blueprint = blueprintRes.data
    const departmentsData = deptRes.data ?? []

    const deadline = settings.deadline ? new Date(settings.deadline) : null
    const windowOpen = deadline !== null && new Date() < deadline

    const pathways = (blueprint.pathways as Pathway[]) || []
    if (pathways.length === 0) {
      throw new BadRequestException('Blueprint has no pathways configured')
    }

    const deptMap = new Map(departmentsData.map((d) => [d.code, d.id]))
    const deptIdToName = new Map(departmentsData.map((d) => [d.id, d.name]))

    const defaultPathway = pathways[0]
    const slots = await this.resolvePathwaySlots(defaultPathway, user, deptMap, deptIdToName)

    const { data: existingReg } = await this.supabase.admin
      .from('student_registrations')
      .select('selected_courses, pathway_id')
      .eq('student_id', user.userId)
      .eq('semester', semester)
      .maybeSingle()

    return {
      success: true,
      windowOpen,
      deadline: settings.deadline,
      academicYear: settings.academic_year,
      minCredits: blueprint.min_credits ?? settings.min_credits ?? 20,
      maxCredits: blueprint.max_credits ?? settings.max_credits ?? 24,
      pathways,
      selectedPathwayId: existingReg?.pathway_id ?? defaultPathway.id,
      slots,
      existingRegistration: existingReg ? existingReg.selected_courses : null,
    }
  }

  async getPathwaySlots(pathwayId: string, user: AuthUser) {
    const { data: blueprint } = await this.supabase.admin
      .from('semester_blueprints')
      .select('*')
      .eq('department_id', user.department_id)
      .eq('semester', user.current_semester)
      .single()

    if (!blueprint) throw new NotFoundException('Blueprint not found for this semester')

    const pathways = blueprint.pathways as Pathway[] | null
    const pathway = pathways?.find((p) => p.id === pathwayId)
    if (!pathway) throw new NotFoundException('Pathway not found')

    const { data: departmentsData } = await this.supabase.admin
      .from('departments')
      .select('id, name, code')

    const deptMap = new Map((departmentsData ?? []).map((d) => [d.code, d.id]))
    const deptIdToName = new Map((departmentsData ?? []).map((d) => [d.id, d.name]))

    const slots = await this.resolvePathwaySlots(pathway, user, deptMap, deptIdToName)

    return {
      success: true,
      data: {
        pathway_id: pathway.id,
        pathway_name: pathway.name,
        slots,
      },
    }
  }

  async submitCourses(
    body: { semester: number; pathway_id: string; courses: string[] },
    user: AuthUser,
  ) {
    const { semester, pathway_id, courses } = body

    if (new Set(courses).size !== courses.length) {
      throw new BadRequestException('Duplicate courses detected in submission')
    }

    if (semester !== user.current_semester) {
      throw new BadRequestException('Submitted semester does not match current semester')
    }

    const [settingsRes, blueprintRes] = await Promise.all([
      this.supabase.admin
        .from('campus_settings')
        .select('deadline, min_credits, max_credits, academic_year')
        .eq('campus_id', user.campus_id)
        .single(),
      this.supabase.admin
        .from('semester_blueprints')
        .select('*')
        .eq('department_id', user.department_id)
        .eq('semester', semester)
        .single(),
    ])

    const settings = settingsRes.data
    const blueprint = blueprintRes.data

    if (!settings) throw new NotFoundException('Campus settings not found')
    if (!blueprint) throw new NotFoundException('No blueprint found for your semester')

    const deadline = settings.deadline ? new Date(settings.deadline) : null
    if (!deadline || new Date() >= deadline) {
      throw new ForbiddenException('Registration window is closed')
    }

    const pathways = (blueprint.pathways as Pathway[]) || []
    const pathway = pathways.find((p) => p.id === pathway_id)
    if (!pathway) throw new BadRequestException('Invalid pathway selected')

    // Fetch details of selected courses
    const { data: courseData, error: courseErr } = await this.supabase.admin
      .from('courses')
      .select('id, course_code, title, credits, department_id, category')
      .in('id', courses)

    if (courseErr || !courseData || courseData.length !== courses.length) {
      throw new BadRequestException('One or more selected courses are invalid')
    }

    const totalCredits = courseData.reduce((sum, c) => sum + (c.credits ?? 0), 0)
    const minCredits = blueprint.min_credits ?? settings.min_credits ?? 20
    const maxCredits = blueprint.max_credits ?? settings.max_credits ?? 24

    if (totalCredits < minCredits || totalCredits > maxCredits) {
      throw new BadRequestException(
        `Total credits (${totalCredits}) must be between ${minCredits} and ${maxCredits}`,
      )
    }

    const slotPayload: Record<string, any> = {
      student_id: user.userId,
      semester,
      academic_year: settings.academic_year,
      pathway_id,
      total_credits: totalCredits,
      selected_courses: courseData,
      submitted_at: new Date().toISOString(),
    }

    for (let i = 0; i < 6; i++) {
      slotPayload[`slot_${i + 1}_course_id`] = courses[i] || null
    }

    const { error: upsertErr } = await this.supabase.admin
      .from('student_registrations')
      .upsert(slotPayload, { onConflict: 'student_id,semester' })

    if (upsertErr) {
      throw new InternalServerErrorException('Failed to save course registration')
    }

    await this.auditLogger.log({
      eventType: AuditEvents.REGISTRATION_SUBMITTED,
      userId: user.userId,
      userRole: user.role,
      action: `submitted course registration for semester ${semester}`,
      resourceType: 'registration',
      status: 'success',
      metadata: { totalCredits, coursesCount: courses.length },
    })

    return { success: true, message: 'Course registration submitted successfully' }
  }
}
