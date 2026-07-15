import { SLOT_RULES } from '@/core/constants/courseCategories'
import { BlueprintSlot, BlueprintResponse } from '@/core/types/course.types'
import { getSupabaseServerClient } from '@/core/database/supabaseClient'
import { VerifiedStudent } from '@/core/auth/verifyRole'
import { isCourseEligibleForSlot } from '@/core/utils/slotRules'

export async function getBlueprint(auth: VerifiedStudent) {
  const supabase = await getSupabaseServerClient()

  // Parallel fetch: Settings, Blueprint, and all Departments
  const [
    { data: settings, error: settingsError },
    { data: blueprint, error: blueprintError },
    { data: departmentsData }
  ] = await Promise.all([
    supabase
      .from('campus_settings')
      .select('deadline, min_credits, max_credits, academic_year')
      .eq('campus_id', auth.campus_id)
      .single(),
    supabase
      .from('semester_blueprints')
      .select('*')
      .eq('department_id', auth.department_id)
      .eq('semester', auth.current_semester)
      .single(),
    supabase
      .from('departments')
      .select('id, name, code')
  ])

  if (settingsError || !settings) {
    return { success: false, error: 'Campus settings not found', status: 404 }
  }

  if (blueprintError || !blueprint) {
    return { success: false, error: 'Blueprint not found for this semester', status: 404 }
  }

  // Check registration window
  const now = new Date()
  const deadline = settings.deadline ? new Date(settings.deadline) : null
  const windowOpen = deadline !== null && now < deadline

  // Build department code → id map for O(1) lookup
  const deptMap = new Map(departmentsData?.map(d => [d.code, d.id]) || [])

  // PRE-FLIGHT: Identify all slots and batch-fetch FIXED courses
  const slotsInfo = Array.from({ length: 6 }).map((_, i) => ({
    slot: i + 1,
    rule: blueprint[`slot_${i + 1}_rule`],
    target: blueprint[`slot_${i + 1}_target`],
    name: blueprint[`slot_${i + 1}_name`] ?? `Paper ${i + 1}`
  })).filter(s => s.rule && s.target)

  if (slotsInfo.length === 0) {
    return { success: false, error: 'Blueprint has no configured course slots for this semester', status: 400 }
  }

  const fixedTargets = slotsInfo
    .filter(s => s.rule === SLOT_RULES.FIXED)
    .map(s => s.target)

  let fixedCourseIds: string[] = []
  let fixedCoursesMap: Record<string, any> = {}

  if (fixedTargets.length > 0) {
    const { data: fixedCourses } = await supabase
      .from('courses')
      .select('id, course_code, title, department_id, semester, credits, category, tag')
      .in('course_code', fixedTargets)

    if (fixedCourses) {
      fixedCourseIds = fixedCourses.map(c => c.id)
      fixedCoursesMap = Object.fromEntries(fixedCourses.map(c => [c.course_code, c]))
    }
  }

  // FINAL PARALLEL PASS: existing registration + all slot queries simultaneously
  const [existingRegistrationRes, ...resolvedSlots] = await Promise.all([
    // Check if student already submitted this semester
    supabase
      .from('student_registrations')
      .select('slot_1_course_id, slot_2_course_id, slot_3_course_id, slot_4_course_id, slot_5_course_id, slot_6_course_id')
      .eq('student_id', auth.userId)
      .eq('semester', auth.current_semester)
      .eq('academic_year', settings.academic_year)
      .single(),

    // Resolve each slot in parallel
    ...slotsInfo.map(async ({ slot, rule, target, name }) => {
      // FIXED — already resolved from batch fetch
      if (rule === SLOT_RULES.FIXED) {
        return {
          slot,
          rule,
          name,
          course: fixedCoursesMap[target] ?? undefined,
        }
      }

      // Base query — always exclude fixed course IDs from elective dropdowns
      let query = supabase
        .from('courses')
        .select('id, course_code, title, department_id, semester, credits, category, tag')

      if (fixedCourseIds.length > 0) {
        query = query.not('id', 'in', fixedCourseIds)
      }

      // DEPT_RESTRICTED
      if (rule === SLOT_RULES.DEPT_RESTRICTED) {
        const deptCodes = ((target as string) ?? '').split(',').map((code: string) => code.trim())
        const deptIds = deptCodes.map((code: string) => deptMap.get(code)).filter((id): id is string => id !== undefined)
        if (deptIds.length === 0) return { slot, rule, name, options: [] }
        const { data: options } = await query
          .in('department_id', deptIds)
          .eq('semester', auth.current_semester)
          .in('category', ['DSC', 'DSE'])

        const filtered = (options ?? []).filter(c => isCourseEligibleForSlot(c, rule, target, auth.department_id, deptMap))
        return { slot, rule, name, options: filtered }
      }

      // EXCLUDE_DEPT
      if (rule === SLOT_RULES.EXCLUDE_DEPT) {
        const deptCodes = ((target as string) ?? '').split(',').map((code: string) => code.trim())
        const deptIds = deptCodes.map((code: string) => deptMap.get(code)).filter((id): id is string => id !== undefined)
        if (deptIds.length === 0) return { slot, rule, name, options: [] }
        const { data: options } = await query
          .not('department_id', 'in', deptIds)
          .eq('semester', auth.current_semester)
          .in('category', ['DSC', 'DSE'])

        const filtered = (options ?? []).filter(c => isCourseEligibleForSlot(c, rule, target, auth.department_id, deptMap))
        return { slot, rule, name, options: filtered }
      }

      // POOL_RESTRICTED — own department by tag
      if (rule === SLOT_RULES.POOL_RESTRICTED) {
        const { data: options } = await query
          .eq('department_id', auth.department_id)
          .eq('tag', target)
          .eq('semester', auth.current_semester)

        const filtered = (options ?? []).filter(c => isCourseEligibleForSlot(c, rule, target, auth.department_id, deptMap))
        return { slot, rule, name, options: filtered }
      }

      // GLOBAL_BASKET — other departments by tag
      if (rule === SLOT_RULES.GLOBAL_BASKET) {
        let q = query
          .eq('tag', target)
          .eq('semester', auth.current_semester)
          .neq('department_id', auth.department_id)
        const { data: options } = await q
        const filtered = (options ?? []).filter(c => isCourseEligibleForSlot(c, rule, target, auth.department_id, deptMap))
        return { slot, rule, name, options: filtered }
      }

      // Unknown rule — return empty safely
      return { slot, rule, name, options: [] }
    })
  ])

  // Build and return the full response
  const response: BlueprintResponse = {
    window_status: windowOpen ? 'OPEN' : 'CLOSED',
    deadline: settings.deadline ?? '',
    min_credits: blueprint.min_credits,
    max_credits: blueprint.max_credits,
    slots: resolvedSlots as BlueprintSlot[],
  }

  return {
    success: true,
    student: {
      full_name: auth.full_name,
      current_semester: auth.current_semester,
    },
    data: response,
    ...(existingRegistrationRes.data && { existing: existingRegistrationRes.data })
  }
}
