import {
  BadRequestException,
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
import { SLOT_RULES } from '../../core/constants/courseCategories'
import { Pathway, PathwaySlot } from '../../core/types/course.types'
import { isCourseEligibleForSlot } from '../../core/utils/slotRules'

@Injectable()
export class RegistrationsService {
  private readonly logger = new Logger(RegistrationsService.name)

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

    // Fetch all course_prerequisite_rules to enforce department constraints
    const { data: allPrereqRules } = await this.supabase.admin
      .from('course_prerequisite_rules')
      .select('course_id, rule, target')

    const courseRulesMap = new Map<string, any[]>()
    if (allPrereqRules) {
      for (const r of allPrereqRules) {
        if (!courseRulesMap.has(r.course_id)) {
          courseRulesMap.set(r.course_id, [])
        }
        courseRulesMap.get(r.course_id)!.push(r)
      }
    }

    let studentDeptCode = ''
    if (user.department_id) {
      for (const [code, id] of deptMap.entries()) {
        if (id === user.department_id) {
          studentDeptCode = code
          break
        }
      }
    }

    const isCourseAllowedForStudent = (c: any) => {
      const rules = courseRulesMap.get(c.id) || []
      const deptRules = rules.filter((r) => r.rule === 'DEPARTMENT')
      if (deptRules.length > 0) {
        const allAllowed = deptRules.flatMap((r) =>
          r.target.split(',').map((code: string) => code.trim().toUpperCase()),
        )
        if (studentDeptCode && !allAllowed.includes(studentDeptCode.toUpperCase())) {
          return false
        }
      }
      return true
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
          .select('id, course_code, title, department_id, semester, credits, category, tag, seat_limit, prerequisite_course_ids')

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
            isCourseAllowedForStudent(c) && isCourseEligibleForSlot(c, rule, target, user.department_id ?? '', deptMap),
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
            isCourseAllowedForStudent(c) && isCourseEligibleForSlot(c, rule, target, user.department_id ?? '', deptMap),
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
            isCourseAllowedForStudent(c) && isCourseEligibleForSlot(c, rule, target, user.department_id ?? '', deptMap),
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
            isCourseAllowedForStudent(c) && isCourseEligibleForSlot(c, rule, target, user.department_id ?? '', deptMap),
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

    const [prefRes, regRes] = await Promise.all([
      this.supabase.admin
        .from('registration_preferences')
        .select('id, pathway_id, preferences, allocation_metadata, submitted_at')
        .eq('student_id', user.userId)
        .eq('semester', semester)
        .eq('academic_year', settings.academic_year)
        .maybeSingle(),
      this.supabase.admin
        .from('student_registrations')
        .select('id, pathway_id, selections, allocation_metadata, submitted_at, total_credits, slot_1_course_id, slot_2_course_id, slot_3_course_id, slot_4_course_id, slot_5_course_id, slot_6_course_id')
        .eq('student_id', user.userId)
        .eq('semester', semester)
        .eq('academic_year', settings.academic_year)
        .maybeSingle(),
    ])

    const existingPref = prefRes.data
    const existingReg = regRes.data

    let preferences: Record<string, { course_id: string; rank: number }[]> = {}
    let allocationMetadata: Record<string, any> = {
      ...(typeof existingPref?.allocation_metadata === 'object' && existingPref?.allocation_metadata ? existingPref.allocation_metadata : {}),
      ...(typeof existingReg?.allocation_metadata === 'object' && existingReg?.allocation_metadata ? existingReg.allocation_metadata : {}),
    }

    if (existingPref?.preferences) {
      const raw = existingPref.preferences
      if (Array.isArray(raw)) {
        for (const item of raw) {
          const slotKey = `slot_${item.slot}`
          if (Array.isArray(item.choices)) {
            preferences[slotKey] = item.choices
          }
        }
      } else if (typeof raw === 'object') {
        preferences = raw as any
      }
    } else if (existingReg?.selections && Object.keys(existingReg.selections).length > 0) {
      preferences = existingReg.selections as any
    }

    // If no explicit preferences stored yet, derive from confirmed slots
    if (Object.keys(preferences).length === 0 && existingReg) {
      const derivedPrefs: Record<string, { course_id: string; rank: number }[]> = {}
      const derivedMeta: Record<string, any> = { ...allocationMetadata }
      for (let s = 1; s <= 6; s++) {
        const slotKey = `slot_${s}`
        const cid = (existingReg as any)[`${slotKey}_course_id`]
        if (cid) {
          derivedPrefs[slotKey] = [{ course_id: cid, rank: 1 }]
          if (!derivedMeta[slotKey]) {
            derivedMeta[slotKey] = { allocated_by: 'fixed', course_id: cid }
          }
        }
      }
      preferences = derivedPrefs
      allocationMetadata = derivedMeta
    }

    const submittedAt = existingPref?.submitted_at ?? existingReg?.submitted_at ?? null

    return {
      success: true,
      windowOpen,
      deadline: settings.deadline,
      academicYear: settings.academic_year,
      minCredits: blueprint.min_credits ?? settings.min_credits ?? 20,
      maxCredits: blueprint.max_credits ?? settings.max_credits ?? 24,
      pathways,
      selectedPathwayId: existingPref?.pathway_id ?? existingReg?.pathway_id ?? defaultPathway.id,
      slots,
      existingRegistration: Object.keys(preferences).length > 0 ? preferences : null,
      existingPreferences: preferences,
      allocationMetadata: allocationMetadata,
      submittedAt: submittedAt,
      student: {
        full_name: user.full_name || '',
        current_semester: user.current_semester ?? 1,
      },
      existingSlots: existingReg
        ? {
            slot_1: existingReg.slot_1_course_id,
            slot_2: existingReg.slot_2_course_id,
            slot_3: existingReg.slot_3_course_id,
            slot_4: existingReg.slot_4_course_id,
            slot_5: existingReg.slot_5_course_id,
            slot_6: existingReg.slot_6_course_id,
          }
        : null,
    }
  }

  async getMyRegistration(user: AuthUser) {
    return this.getBlueprint(user)
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
    body: {
      semester: number
      pathway_id: string
      courses?: string[]
      preferences?: Record<string, { course_id: string; rank: number }[]>
    },
    user: AuthUser,
  ) {
    const { semester, pathway_id, courses, preferences } = body

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

    // Fetch existing preferences record to freeze submitted_at
    const [existingPrefRes, existingRegRes] = await Promise.all([
      this.supabase.admin
        .from('registration_preferences')
        .select('id, submitted_at, allocation_metadata, preferences')
        .eq('student_id', user.userId)
        .eq('semester', semester)
        .eq('academic_year', settings.academic_year)
        .maybeSingle(),
      this.supabase.admin
        .from('student_registrations')
        .select('id, submitted_at, allocation_metadata')
        .eq('student_id', user.userId)
        .eq('semester', semester)
        .eq('academic_year', settings.academic_year)
        .maybeSingle(),
    ])

    const existingPref = existingPrefRes.data
    const existingReg = existingRegRes.data

    // Step 3 tiebreaker rule: frozen on first submission. Re-ranking preferences never resets this timestamp.
    const submittedAt = existingPref?.submitted_at ?? existingReg?.submitted_at ?? new Date().toISOString()
    const allocationMetadata: Record<string, any> = {
      ...(typeof existingPref?.allocation_metadata === 'object' && existingPref?.allocation_metadata ? existingPref.allocation_metadata : {}),
      ...(typeof existingReg?.allocation_metadata === 'object' && existingReg?.allocation_metadata ? existingReg.allocation_metadata : {}),
    }

    // Resolve fixed targets from blueprint
    const fixedTargets: string[] = []
    pathway.slots.forEach((s) => {
      if (
        s.rule === SLOT_RULES.FIXED ||
        s.rule === SLOT_RULES.AEC_ELECT ||
        s.rule === SLOT_RULES.CAMPUS_FIXED
      ) {
        if (s.target) fixedTargets.push(s.target)
      }
    })

    let fixedCoursesMap: Record<string, any> = {}
    if (fixedTargets.length > 0) {
      const { data: fixedCourses } = await this.supabase.admin
        .from('courses')
        .select('id, course_code, title, credits, department_id, category')
        .in('course_code', fixedTargets)
      if (fixedCourses) {
        fixedCoursesMap = Object.fromEntries(fixedCourses.map((c) => [c.course_code, c]))
      }
    }

    const unifiedPreferences: {
      slot: number
      rule: string
      name?: string
      is_fixed: boolean
      choices: { course_id: string; rank: number }[]
    }[] = []

    const evaluatedCourses: any[] = []
    const fixedCourseAssignments: Record<string, string> = {}

    pathway.slots.forEach((s, i) => {
      const slotNum = i + 1
      const slotKey = `slot_${slotNum}`
      const isFixed =
        s.rule === SLOT_RULES.FIXED ||
        s.rule === SLOT_RULES.AEC_ELECT ||
        s.rule === SLOT_RULES.CAMPUS_FIXED

      if (isFixed && s.target && fixedCoursesMap[s.target]) {
        const fc = fixedCoursesMap[s.target]
        unifiedPreferences.push({
          slot: slotNum,
          rule: s.rule,
          name: s.name,
          is_fixed: true,
          choices: [{ course_id: fc.id, rank: 1 }],
        })
        allocationMetadata[slotKey] = { allocated_by: 'fixed' }
        fixedCourseAssignments[slotKey] = fc.id
        evaluatedCourses.push(fc)
      } else {
        // Elective slot: student submits up to 3 preferences
        let slotChoices: { course_id: string; rank: number }[] = []
        if (preferences && preferences[slotKey]) {
          slotChoices = preferences[slotKey]
        } else if (courses && courses[i]) {
          slotChoices = [{ course_id: courses[i], rank: 1 }]
        }

        if (slotChoices.length > 3) {
          throw new BadRequestException(`Maximum 3 preferences allowed for ${slotKey}`)
        }

        unifiedPreferences.push({
          slot: slotNum,
          rule: s.rule,
          name: s.name,
          is_fixed: false,
          choices: slotChoices,
        })
      }
    })

    // Collect all elective courses mentioned to validate department restriction
    const allElectiveCourseIds = new Set<string>()
    unifiedPreferences.forEach((sItem) => {
      if (!sItem.is_fixed) {
        sItem.choices.forEach((p) => allElectiveCourseIds.add(p.course_id))
      }
    })

    if (allElectiveCourseIds.size > 0) {
      const { data: electiveCourses } = await this.supabase.admin
        .from('courses')
        .select('id, course_code, title, credits, department_id, category')
        .in('id', Array.from(allElectiveCourseIds))

      // Compute total credits based on fixed courses + rank 1 electives for credit check
      const rank1ElectiveIds = unifiedPreferences
        .filter((s) => !s.is_fixed)
        .map((s) => s.choices.find((c) => c.rank === 1)?.course_id)
        .filter((id): id is string => !!id)

      const rank1Courses = (electiveCourses ?? []).filter((c) => rank1ElectiveIds.includes(c.id))
      evaluatedCourses.push(...rank1Courses)
    }

    const totalCredits = evaluatedCourses.reduce((sum, c) => sum + (c.credits ?? 0), 0)

    // 1. Save unified preferences to registration_preferences table
    const prefUpsertPayload = {
      student_id: user.userId,
      campus_id: user.campus_id,
      semester,
      academic_year: settings.academic_year,
      pathway_id,
      preferences: unifiedPreferences,
      allocation_metadata: allocationMetadata,
      submitted_at: submittedAt,
      updated_at: new Date().toISOString(),
    }

    const { error: prefErr } = await this.supabase.admin
      .from('registration_preferences')
      .upsert(prefUpsertPayload, { onConflict: 'student_id,semester,academic_year' })

    if (prefErr) {
      this.logger.error(`Failed to save registration preferences: ${prefErr.message}`)
      throw new InternalServerErrorException('Failed to save course preferences')
    }

    // 2. Write confirmed fixed slots to student_registrations table (keeping elective slots NULL until allocation runs)
    const regPayload: Record<string, any> = {
      student_id: user.userId,
      campus_id: user.campus_id,
      semester,
      academic_year: settings.academic_year,
      pathway_id,
      total_credits: totalCredits,
      allocation_metadata: allocationMetadata,
      submitted_at: submittedAt,
      slot_1_course_id: fixedCourseAssignments.slot_1 ?? null,
      slot_2_course_id: fixedCourseAssignments.slot_2 ?? null,
      slot_3_course_id: fixedCourseAssignments.slot_3 ?? null,
      slot_4_course_id: fixedCourseAssignments.slot_4 ?? null,
      slot_5_course_id: fixedCourseAssignments.slot_5 ?? null,
      slot_6_course_id: fixedCourseAssignments.slot_6 ?? null,
    }

    const { error: regErr } = await this.supabase.admin
      .from('student_registrations')
      .upsert(regPayload, { onConflict: 'student_id,semester,academic_year' })

    if (regErr) {
      this.logger.error(`Failed to write confirmed fixed slots to student_registrations: ${regErr.message}`)
      // Not fatal to preferences, but log error
    }

    await this.auditLogger.log({
      eventType: AuditEvents.REGISTRATION_SUBMITTED,
      userId: user.userId,
      userRole: user.role,
      action: `submitted course registration preferences for semester ${semester}`,
      resourceType: 'registration',
      status: 'success',
      metadata: { totalCredits, coursesCount: evaluatedCourses.length },
    })

    return {
      success: true,
      message: 'Course registration preferences submitted successfully',
      total_credits: totalCredits,
    }
  }
}
