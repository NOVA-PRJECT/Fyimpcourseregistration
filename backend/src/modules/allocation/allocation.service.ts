import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { SupabaseService } from '../../core/database/supabase.service'
import { AuditLoggerService, AuditEvents } from '../../core/logging/audit-logger.service'
import { ServerLoggerService } from '../../core/logging/server-logger.service'
import { AuthUser } from '../../core/auth/types'

interface CourseItem {
  id: string
  course_code: string
  title: string
  semester: number
  department_id: string
  seat_limit: number
  prerequisite_course_ids: string[]
  allowed_department_ids: string[]
}

interface PreferenceChoice {
  course_id: string
  rank: number
}

@Injectable()
export class AllocationService {
  private readonly logger = new Logger(AllocationService.name)

  constructor(
    private readonly supabase: SupabaseService,
    private readonly auditLogger: AuditLoggerService,
    private readonly serverLogger: ServerLoggerService,
  ) {}

  // ──────────────── Campus Director: Trigger 3-Round Allocation ────────────────
  async runAllocation(
    body: { academicYear: string; semester: number },
    user: AuthUser,
  ) {
    const campusId = user.campus_id
    if (!campusId) {
      throw new BadRequestException('Campus ID is required to run course allocation')
    }

    // Step A: Check if a run is already in progress
    const { data: activeRun } = await this.supabase.admin
      .from('allocation_runs')
      .select('id')
      .eq('campus_id', campusId)
      .eq('academic_year', body.academicYear)
      .eq('semester', body.semester)
      .eq('status', 'running')
      .maybeSingle()

    if (activeRun) {
      throw new ConflictException(
        'An allocation run is already in progress for this academic year and semester',
      )
    }

    // Step B: Insert allocation_runs row with status 'running'
    const { data: run, error: runErr } = await this.supabase.admin
      .from('allocation_runs')
      .insert({
        academic_year: body.academicYear,
        semester: body.semester,
        campus_id: campusId,
        triggered_by: user.userId,
        status: 'running',
      })
      .select('id')
      .single()

    if (runErr || !run) {
      throw new InternalServerErrorException('Failed to initialize allocation run')
    }

    try {
      // Step C: Fetch all courses offered in this semester
      const { data: coursesData, error: courseErr } = await this.supabase.admin
        .from('courses')
        .select('id, course_code, title, semester, department_id, seat_limit, prerequisite_course_ids, allowed_department_ids')
        .eq('semester', body.semester)

      if (courseErr) throw courseErr

      const courses: CourseItem[] = (coursesData ?? []).map((c) => ({
        id: c.id,
        course_code: c.course_code,
        title: c.title,
        semester: c.semester,
        department_id: c.department_id,
        seat_limit: c.seat_limit ? Number(c.seat_limit) : 60,
        prerequisite_course_ids: Array.isArray(c.prerequisite_course_ids) ? c.prerequisite_course_ids : [],
        allowed_department_ids: Array.isArray(c.allowed_department_ids) ? c.allowed_department_ids : [],
      }))

      const courseMap = new Map<string, CourseItem>(courses.map((c) => [c.id, c]))

      // Step D: Fetch all student registrations for this campus, academic year, and semester
      const { data: registrations, error: regErr } = await this.supabase.admin
        .from('student_registrations')
        .select(`
          id,
          student_id,
          semester,
          academic_year,
          preferences,
          allocation_metadata,
          submitted_at,
          slot_1_course_id,
          slot_2_course_id,
          slot_3_course_id,
          slot_4_course_id,
          slot_5_course_id,
          slot_6_course_id,
          students!inner (
            id,
            department_id,
            current_semester
          )
        `)
        .eq('campus_id', campusId)
        .eq('academic_year', body.academicYear)
        .eq('semester', body.semester)

      if (regErr) throw regErr

      const studentList = registrations ?? []
      const studentIds = studentList.map((r) => r.student_id)

      // Step E: Fetch prior completed registrations for scoring prerequisites
      const studentCompletedCoursesMap = new Map<string, Set<string>>()
      if (studentIds.length > 0) {
        const { data: priorRegs } = await this.supabase.admin
          .from('student_registrations')
          .select('student_id, slot_1_course_id, slot_2_course_id, slot_3_course_id, slot_4_course_id, slot_5_course_id, slot_6_course_id')
          .in('student_id', studentIds)
          .lt('semester', body.semester)

        for (const pr of priorRegs ?? []) {
          if (!studentCompletedCoursesMap.has(pr.student_id)) {
            studentCompletedCoursesMap.set(pr.student_id, new Set())
          }
          const set = studentCompletedCoursesMap.get(pr.student_id)!
          for (let s = 1; s <= 6; s++) {
            const cid = (pr as any)[`slot_${s}_course_id`]
            if (cid) set.add(cid)
          }
        }
      }

      // Step F: Compute Fixed Seat Counts and Initial Elective Capacity N
      // N = seat_limit - count of students already confirmed for this course via fixed slot
      const remainingElectiveSeats = new Map<string, number>()
      for (const course of courses) {
        let fixedCount = 0
        for (const reg of studentList) {
          const meta = (reg.allocation_metadata as Record<string, any>) || {}
          for (let s = 1; s <= 6; s++) {
            const slotKey = `slot_${s}`
            const cid = (reg as any)[`${slotKey}_course_id`]
            if (cid === course.id && meta[slotKey]?.allocated_by === 'fixed') {
              fixedCount++
            }
          }
        }
        const capacityN = Math.max(0, course.seat_limit - fixedCount)
        remainingElectiveSeats.set(course.id, capacityN)
      }

      // Track slot resolution status per registration
      // slotKey -> { resolved: boolean, course_id: string | null }
      const regSlotState = new Map<string, Map<string, { resolved: boolean; course_id: string | null }>>()
      for (const reg of studentList) {
        const meta = (reg.allocation_metadata as Record<string, any>) || {}
        const slotMap = new Map<string, { resolved: boolean; course_id: string | null }>()
        for (let s = 1; s <= 6; s++) {
          const slotKey = `slot_${s}`
          const isFixed = meta[slotKey]?.allocated_by === 'fixed'
          if (isFixed) {
            slotMap.set(slotKey, { resolved: true, course_id: (reg as any)[`${slotKey}_course_id`] })
          } else {
            slotMap.set(slotKey, { resolved: false, course_id: null })
          }
        }
        regSlotState.set(reg.id, slotMap)
      }

      // Scoring helper: Score = prerequisite_points + proximity_points
      const calculateStudentScore = (
        studentId: string,
        studentSemester: number,
        course: CourseItem,
      ): number => {
        let prereqPoints = 0
        const priorSet = studentCompletedCoursesMap.get(studentId)
        if (priorSet && course.prerequisite_course_ids.length > 0) {
          for (const pid of course.prerequisite_course_ids) {
            if (priorSet.has(pid)) prereqPoints += 1
          }
        }
        const proximityPoints = Math.max(0, studentSemester - course.semester)
        return prereqPoints + proximityPoints
      }

      const finalAllocations: {
        registration_id: string
        slot_key: string
        course_id: string
        metadata: any
      }[] = []

      // Helper to run a specific allocation round (1, 2, or 3)
      const executeRound = (roundNumber: 1 | 2 | 3) => {
        // Collect candidates for each course for this round
        const courseCandidates = new Map<
          string,
          {
            regId: string
            studentId: string
            studentDeptId: string
            studentSemester: number
            submittedAt: string
            slotKey: string
            score: number
          }[]
        >()

        for (const reg of studentList) {
          const slotMap = regSlotState.get(reg.id)!
          const preferences = (reg.preferences as Record<string, PreferenceChoice[]>) || {}
          const studentDeptId = (reg.students as any)?.department_id ?? ''
          const studentSemester = (reg.students as any)?.current_semester ?? body.semester

          for (let s = 1; s <= 6; s++) {
            const slotKey = `slot_${s}`
            const currentSlot = slotMap.get(slotKey)
            if (!currentSlot || currentSlot.resolved) continue

            const slotPrefs = preferences[slotKey] || []
            const targetPref = slotPrefs.find((p) => p.rank === roundNumber)
            if (!targetPref) continue

            const course = courseMap.get(targetPref.course_id)
            if (!course) continue

            // Department filter: check allowed_department_ids (empty array = all allowed)
            if (
              course.allowed_department_ids.length > 0 &&
              !course.allowed_department_ids.includes(studentDeptId)
            ) {
              continue
            }

            const score = calculateStudentScore(reg.student_id, studentSemester, course)
            if (!courseCandidates.has(course.id)) {
              courseCandidates.set(course.id, [])
            }

            courseCandidates.get(course.id)!.push({
              regId: reg.id,
              studentId: reg.student_id,
              studentDeptId,
              studentSemester,
              submittedAt: reg.submitted_at,
              slotKey,
              score,
            })
          }
        }

        // For each course, sort candidates and allocate available seats
        for (const [courseId, candidates] of courseCandidates.entries()) {
          const remSeats = remainingElectiveSeats.get(courseId) ?? 0
          if (remSeats <= 0 || candidates.length === 0) continue

          // Sort by score DESC, then tiebreaker submitted_at ASC (earlier wins)
          candidates.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score
            return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
          })

          const winnersCount = Math.min(remSeats, candidates.length)
          for (let i = 0; i < winnersCount; i++) {
            const winner = candidates[i]
            const slotMap = regSlotState.get(winner.regId)!
            // Check if slot was already resolved in this pass
            if (slotMap.get(winner.slotKey)?.resolved) continue

            slotMap.set(winner.slotKey, { resolved: true, course_id: courseId })
            remainingElectiveSeats.set(courseId, remainingElectiveSeats.get(courseId)! - 1)

            finalAllocations.push({
              registration_id: winner.regId,
              slot_key: winner.slotKey,
              course_id: courseId,
              metadata: {
                allocated_by: 'algorithm',
                run_id: run.id,
                round: roundNumber,
                score: winner.score,
                allocated_at: new Date().toISOString(),
              },
            })
          }
        }
      }

      // Step G: Run 3 Allocation Rounds
      executeRound(1)
      executeRound(2)
      executeRound(3)

      // Step H: Commit allocations atomically
      // First attempt using the transactional Postgres RPC function
      const { data: rpcRes, error: rpcErr } = await this.supabase.admin.rpc(
        'apply_course_allocation',
        {
          p_run_id: run.id,
          p_campus_id: campusId,
          p_academic_year: body.academicYear,
          p_semester: body.semester,
          p_allocations: finalAllocations,
        },
      )

      if (rpcErr) {
        this.logger.warn(
          `RPC apply_course_allocation unavailable (${rpcErr.message}); executing direct fallback batch transaction`,
        )

        // Fallback: reset elective slots and batch update
        for (const reg of studentList) {
          const meta = (reg.allocation_metadata as Record<string, any>) || {}
          const resetPayload: Record<string, any> = {}
          const newMeta: Record<string, any> = {}

          for (let s = 1; s <= 6; s++) {
            const slotKey = `slot_${s}`
            if (meta[slotKey]?.allocated_by === 'fixed') {
              resetPayload[`${slotKey}_course_id`] = (reg as any)[`${slotKey}_course_id`]
              newMeta[slotKey] = meta[slotKey]
            } else {
              resetPayload[`${slotKey}_course_id`] = null
            }
          }
          resetPayload.allocation_metadata = newMeta

          await this.supabase.admin
            .from('student_registrations')
            .update(resetPayload)
            .eq('id', reg.id)
        }

        // Apply newly allocated elective slots
        for (const alloc of finalAllocations) {
          const { data: currentReg } = await this.supabase.admin
            .from('student_registrations')
            .select('allocation_metadata')
            .eq('id', alloc.registration_id)
            .single()

          const mergedMeta = {
            ...(currentReg?.allocation_metadata || {}),
            [alloc.slot_key]: alloc.metadata,
          }

          await this.supabase.admin
            .from('student_registrations')
            .update({
              [`${alloc.slot_key}_course_id`]: alloc.course_id,
              allocation_metadata: mergedMeta,
            })
            .eq('id', alloc.registration_id)
        }

        await this.supabase.admin
          .from('allocation_runs')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', run.id)
      }

      await this.auditLogger.log({
        eventType: AuditEvents.ALLOCATION_RUN_COMPLETED,
        userId: user.userId,
        userRole: user.role,
        action: `completed course allocation run for semester ${body.semester} (${body.academicYear})`,
        resourceType: 'allocation_run',
        resourceId: run.id,
        status: 'success',
        metadata: {
          allocated_count: finalAllocations.length,
          total_students: studentList.length,
        },
      })

      return {
        success: true,
        run_id: run.id,
        allocated_count: finalAllocations.length,
        total_students: studentList.length,
      }
    } catch (err: any) {
      // Step I: On any failure, mark run as failed with error_message
      await this.supabase.admin
        .from('allocation_runs')
        .update({
          status: 'failed',
          error_message: err?.message ?? 'Allocation algorithm execution encountered an error',
        })
        .eq('id', run.id)

      throw new InternalServerErrorException(
        err?.message ?? 'Failed to execute course allocation algorithm',
      )
    }
  }

  // ──────────────── Status Polling ────────────────
  async getRunStatus(academicYear: string, semester: number, user: AuthUser) {
    const campusId = user.campus_id
    if (!campusId) {
      throw new BadRequestException('Campus ID missing')
    }

    const { data: run, error } = await this.supabase.admin
      .from('allocation_runs')
      .select('*')
      .eq('campus_id', campusId)
      .eq('academic_year', academicYear)
      .eq('semester', semester)
      .order('triggered_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      throw new InternalServerErrorException('Failed to query allocation run status')
    }

    return {
      success: true,
      run: run ?? null,
    }
  }

  // ──────────────── HOD: Unresolved Students ────────────────
  async getUnresolvedStudents(semesterId: string | number, user: AuthUser) {
    const departmentId = user.department_id
    if (!departmentId) {
      throw new ForbiddenException('Department affiliation required')
    }

    const sem = Number(semesterId)
    if (isNaN(sem)) throw new BadRequestException('Invalid semester')

    // Find students in HOD's department
    const { data: students, error: studentErr } = await this.supabase.admin
      .from('students')
      .select('id, full_name, cap_application_number, current_semester')
      .eq('department_id', departmentId)
      .eq('current_semester', sem)

    if (studentErr) throw new InternalServerErrorException('Failed to fetch department students')

    const studentIds = (students ?? []).map((s) => s.id)
    if (studentIds.length === 0) {
      return { success: true, unresolvedStudents: [] }
    }

    // Fetch registrations
    const { data: registrations, error: regErr } = await this.supabase.admin
      .from('student_registrations')
      .select('id, student_id, preferences, allocation_metadata, slot_1_course_id, slot_2_course_id, slot_3_course_id, slot_4_course_id, slot_5_course_id, slot_6_course_id')
      .in('student_id', studentIds)
      .eq('semester', sem)

    if (regErr) throw new InternalServerErrorException('Failed to fetch registrations')

    // Fetch course titles for preference references
    const courseIdsToFetch = new Set<string>()
    for (const reg of registrations ?? []) {
      const prefs = (reg.preferences as Record<string, PreferenceChoice[]>) || {}
      Object.values(prefs).forEach((pList) => {
        pList.forEach((p) => courseIdsToFetch.add(p.course_id))
      })
    }

    let courseNameMap = new Map<string, { code: string; title: string }>()
    if (courseIdsToFetch.size > 0) {
      const { data: courseMeta } = await this.supabase.admin
        .from('courses')
        .select('id, course_code, title')
        .in('id', Array.from(courseIdsToFetch))

      for (const cm of courseMeta ?? []) {
        courseNameMap.set(cm.id, { code: cm.course_code, title: cm.title })
      }
    }

    const studentMap = new Map(students!.map((s) => [s.id, s]))
    const unresolvedList: any[] = []

    for (const reg of registrations ?? []) {
      const student = studentMap.get(reg.student_id)
      if (!student) continue

      const meta = (reg.allocation_metadata as Record<string, any>) || {}
      const preferences = (reg.preferences as Record<string, PreferenceChoice[]>) || {}
      const unresolvedSlots: any[] = []

      for (let s = 1; s <= 6; s++) {
        const slotKey = `slot_${s}`
        const courseId = (reg as any)[`${slotKey}_course_id`]
        const isFixed = meta[slotKey]?.allocated_by === 'fixed'

        // Unresolved if not fixed, has preferences (or was expected), and courseId is null
        if (!isFixed && preferences[slotKey] && !courseId) {
          const submittedPrefs = (preferences[slotKey] || []).map((p) => ({
            rank: p.rank,
            course_id: p.course_id,
            course_code: courseNameMap.get(p.course_id)?.code ?? 'Unknown',
            course_title: courseNameMap.get(p.course_id)?.title ?? 'Course',
          }))

          unresolvedSlots.push({
            slot_key: slotKey,
            slot_number: s,
            submitted_preferences: submittedPrefs,
          })
        }
      }

      if (unresolvedSlots.length > 0) {
        unresolvedList.push({
          registration_id: reg.id,
          student_id: student.id,
          full_name: student.full_name,
          cap_application_number: student.cap_application_number,
          current_semester: student.current_semester,
          unresolved_slots: unresolvedSlots,
        })
      }
    }

    return {
      success: true,
      unresolvedStudents: unresolvedList,
    }
  }

  // ──────────────── HOD: Remaining Course Seats ────────────────
  async getRemainingSeats(semesterId: string | number, user: AuthUser) {
    const departmentId = user.department_id
    if (!departmentId) {
      throw new ForbiddenException('Department affiliation required')
    }

    const sem = Number(semesterId)
    if (isNaN(sem)) throw new BadRequestException('Invalid semester')

    // Fetch courses owned by HOD's department for this semester
    const { data: courses, error: courseErr } = await this.supabase.admin
      .from('courses')
      .select('id, course_code, title, credits, category, seat_limit')
      .eq('department_id', departmentId)
      .eq('semester', sem)

    if (courseErr) throw new InternalServerErrorException('Failed to fetch courses')

    const courseList = courses ?? []
    const results: any[] = []

    for (const course of courseList) {
      const seatLimit = course.seat_limit ? Number(course.seat_limit) : 60

      // Count all students who have this course allocated across slots 1 to 6
      const { count, error: countErr } = await this.supabase.admin
        .from('student_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('semester', sem)
        .or(
          `slot_1_course_id.eq.${course.id},slot_2_course_id.eq.${course.id},slot_3_course_id.eq.${course.id},slot_4_course_id.eq.${course.id},slot_5_course_id.eq.${course.id},slot_6_course_id.eq.${course.id}`,
        )

      const totalAllocated = count ?? 0
      const remaining = Math.max(0, seatLimit - totalAllocated)

      results.push({
        id: course.id,
        course_code: course.course_code,
        title: course.title,
        category: course.category,
        credits: course.credits,
        seat_limit: seatLimit,
        total_allocated: totalAllocated,
        remaining_seats: remaining,
      })
    }

    return {
      success: true,
      courses: results,
    }
  }

  // ──────────────── HOD: Manual Allocation ────────────────
  async manualAllocate(
    body: { student_id: string; slot_key: string; course_id: string },
    user: AuthUser,
  ) {
    const departmentId = user.department_id
    if (!departmentId) {
      throw new ForbiddenException('Department affiliation required')
    }

    const { student_id, slot_key, course_id } = body
    if (!student_id || !slot_key || !course_id) {
      throw new BadRequestException('Missing required fields (student_id, slot_key, course_id)')
    }

    const validSlots = ['slot_1', 'slot_2', 'slot_3', 'slot_4', 'slot_5', 'slot_6']
    if (!validSlots.includes(slot_key)) {
      throw new BadRequestException(`Invalid slot key: ${slot_key}`)
    }

    // Validate course belongs to HOD's department
    const { data: course, error: courseErr } = await this.supabase.admin
      .from('courses')
      .select('id, course_code, title, department_id, seat_limit, semester')
      .eq('id', course_id)
      .single()

    if (courseErr || !course) {
      throw new NotFoundException('Course not found')
    }

    if (course.department_id !== departmentId) {
      throw new ForbiddenException('You may only allocate courses belonging to your department')
    }

    // Validate course capacity
    const seatLimit = course.seat_limit ? Number(course.seat_limit) : 60
    const { count: allocatedCount } = await this.supabase.admin
      .from('student_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('semester', course.semester)
      .or(
        `slot_1_course_id.eq.${course.id},slot_2_course_id.eq.${course.id},slot_3_course_id.eq.${course.id},slot_4_course_id.eq.${course.id},slot_5_course_id.eq.${course.id},slot_6_course_id.eq.${course.id}`,
      )

    if ((allocatedCount ?? 0) >= seatLimit) {
      throw new BadRequestException(`Course ${course.course_code} has no remaining seats (${seatLimit}/${seatLimit})`)
    }

    // Validate student registration exists and slot is currently unresolved
    const { data: reg, error: regErr } = await this.supabase.admin
      .from('student_registrations')
      .select('id, allocation_metadata, slot_1_course_id, slot_2_course_id, slot_3_course_id, slot_4_course_id, slot_5_course_id, slot_6_course_id')
      .eq('student_id', student_id)
      .eq('semester', course.semester)
      .single()

    if (regErr || !reg) {
      throw new NotFoundException('Student registration record not found for this semester')
    }

    const currentCourseInSlot = (reg as any)[`${slot_key}_course_id`]
    const meta = (reg.allocation_metadata as Record<string, any>) || {}
    if (meta[slot_key]?.allocated_by === 'fixed') {
      throw new BadRequestException('Cannot manually override a fixed slot assignment')
    }

    // Update slot and metadata
    const updatedMeta = {
      ...meta,
      [slot_key]: {
        allocated_by: 'hod',
        by_user: user.userId,
        at: new Date().toISOString(),
      },
    }

    const { error: updateErr } = await this.supabase.admin
      .from('student_registrations')
      .update({
        [`${slot_key}_course_id`]: course_id,
        allocation_metadata: updatedMeta,
      })
      .eq('id', reg.id)

    if (updateErr) {
      throw new InternalServerErrorException('Failed to apply manual allocation')
    }

    // Audit log
    await this.auditLogger.log({
      eventType: AuditEvents.MANUAL_ALLOCATION,
      userId: user.userId,
      userRole: user.role,
      action: `manually allocated ${course.course_code} to student ${student_id} for ${slot_key}`,
      resourceType: 'registration',
      resourceId: reg.id,
      status: 'success',
      metadata: {
        student_id,
        slot_key,
        course_id,
        course_code: course.course_code,
      },
    })

    return {
      success: true,
      message: `Course ${course.course_code} successfully allocated to student`,
    }
  }
}
