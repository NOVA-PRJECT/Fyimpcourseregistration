import { SLOT_RULES } from '@/core/constants/courseCategories'
import { BlueprintSlot, BlueprintResponse, Pathway, PathwaySlot } from '@/core/types/course.types'
import { getSupabaseServerClient } from '@/core/database/supabaseClient'
import { VerifiedStudent } from '@/core/auth/verifyRole'
import { isCourseEligibleForSlot } from '@/core/utils/slotRules'

/**
 * Resolve a single pathway's slots into BlueprintSlot[] with course options.
 * Extracted so it can be reused by getPathwaySlots service.
 */
export async function resolvePathwaySlots(
  pathway: Pathway,
  auth: VerifiedStudent,
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
  deptMap: Map<string, string>,
  deptIdToName: Map<string, string>,
) {
  const slotsInfo = pathway.slots.map((s: PathwaySlot, i: number) => ({
    slot: i + 1,
    rule: s.rule,
    target: s.target,
    name: s.name ?? `Paper ${i + 1}`,
  })).filter(s => s.rule && s.target)

  if (slotsInfo.length === 0) {
    return { success: false as const, error: 'Pathway has no configured course slots', status: 400 }
  }

  const fixedTargets = slotsInfo
    .filter(s => s.rule === SLOT_RULES.FIXED || s.rule === SLOT_RULES.AEC_ELECT || s.rule === SLOT_RULES.CAMPUS_FIXED)
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

  const resolvedSlots = await Promise.all(
    slotsInfo.map(async ({ slot, rule, target, name }) => {
      // FIXED / AEC_ELECT / CAMPUS_FIXED — already resolved from batch fetch
      if (rule === SLOT_RULES.FIXED || rule === SLOT_RULES.AEC_ELECT || rule === SLOT_RULES.CAMPUS_FIXED) {
        const c = fixedCoursesMap[target]
        return {
          slot,
          rule,
          name,
          course: c ? {
            ...c,
            department_name: deptIdToName.get(c.department_id) || 'Unknown'
          } : undefined,
        }
      }

      // Base query — always exclude fixed course IDs from elective dropdowns
      let query = supabase
        .from('courses')
        .select('id, course_code, title, department_id, semester, credits, category, tag')

      if (fixedCourseIds.length > 0) {
        query = query.not('id', 'in', `(${fixedCourseIds.join(',')})`)
      }

      // DEPT_RESTRICTED
      if (rule === SLOT_RULES.DEPT_RESTRICTED) {
        const deptCodes = ((target as string) ?? '').split(',').map((code: string) => code.trim())
        const deptIds = deptCodes.map((code: string) => deptMap.get(code)).filter((id): id is string => id !== undefined)
        if (deptIds.length === 0) return { slot, rule, name, options: [] }
        const { data: options, error: optionsError } = await query
          .in('department_id', deptIds)
          .eq('semester', auth.current_semester)
          .in('category', ['DSC', 'DSE'])

        if (optionsError) {
          console.error('getBlueprint DEPT_RESTRICTED query error:', optionsError)
        }

        const filtered = (options ?? []).filter(c => isCourseEligibleForSlot(c, rule, target, auth.department_id, deptMap))
        const mapped = filtered.map(c => ({
          ...c,
          department_name: deptIdToName.get(c.department_id) || 'Unknown'
        }))
        return { slot, rule, name, options: mapped }
      }

      // EXCLUDE_DEPT
      if (rule === SLOT_RULES.EXCLUDE_DEPT) {
        const deptCodes = ((target as string) ?? '').split(',').map((code: string) => code.trim())
        const deptIds = deptCodes.map((code: string) => deptMap.get(code)).filter((id): id is string => id !== undefined)
        if (deptIds.length === 0) return { slot, rule, name, options: [] }
        const { data: options, error: optionsError } = await query
          .not('department_id', 'in', `(${deptIds.join(',')})`)
          .eq('semester', auth.current_semester)
          .in('category', ['DSC', 'DSE'])

        if (optionsError) {
          console.error('getBlueprint EXCLUDE_DEPT query error:', optionsError)
        }

        const filtered = (options ?? []).filter(c => isCourseEligibleForSlot(c, rule, target, auth.department_id, deptMap))
        const mapped = filtered.map(c => ({
          ...c,
          department_name: deptIdToName.get(c.department_id) || 'Unknown'
        }))
        return { slot, rule, name, options: mapped }
      }

      // POOL_RESTRICTED — own department by tag
      if (rule === SLOT_RULES.POOL_RESTRICTED) {
        const { data: options, error: optionsError } = await query
          .eq('department_id', auth.department_id)
          .eq('tag', target)
          .eq('semester', auth.current_semester)

        if (optionsError) {
          console.error('getBlueprint POOL_RESTRICTED query error:', optionsError)
        }

        const filtered = (options ?? []).filter(c => isCourseEligibleForSlot(c, rule, target, auth.department_id, deptMap))
        const mapped = filtered.map(c => ({
          ...c,
          department_name: deptIdToName.get(c.department_id) || 'Unknown'
        }))
        return { slot, rule, name, options: mapped }
      }

      // GLOBAL_BASKET — other departments by tag
      if (rule === SLOT_RULES.GLOBAL_BASKET) {
        let q = query
          .eq('tag', target)
          .eq('semester', auth.current_semester)
        if (target.includes('MDC')) {
          q = q.neq('department_id', auth.department_id)
        }
        const { data: options, error: optionsError } = await q
        if (optionsError) {
          console.error('getBlueprint GLOBAL_BASKET query error:', optionsError)
        }
        const filtered = (options ?? []).filter(c => isCourseEligibleForSlot(c, rule, target, auth.department_id, deptMap))
        const mapped = filtered.map(c => ({
          ...c,
          department_name: deptIdToName.get(c.department_id) || 'Unknown'
        }))
        return { slot, rule, name, options: mapped }
      }

      // Unknown rule — return empty safely
      return { slot, rule, name, options: [] }
    })
  )

  return { success: true as const, slots: resolvedSlots as BlueprintSlot[] }
}

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

  // Read pathways from JSONB column
  const pathways = blueprint.pathways as Pathway[] | null

  if (!pathways || pathways.length === 0) {
    return { success: false, error: 'Blueprint not configured', status: 400 }
  }

  // Check registration window
  const now = new Date()
  const deadline = settings.deadline ? new Date(settings.deadline) : null
  const windowOpen = deadline !== null && now < deadline

  // Build department code → id map for O(1) lookup
  const deptMap = new Map(departmentsData?.map(d => [d.code, d.id]) || [])
  const deptIdToName = new Map(departmentsData?.map(d => [d.id, d.name]) || [])

  // Fetch existing registration (includes pathway_id and selections now)
  const { data: existingReg } = await supabase
    .from('student_registrations')
    .select('pathway_id, selections, slot_1_course_id, slot_2_course_id, slot_3_course_id, slot_4_course_id, slot_5_course_id, slot_6_course_id')
    .eq('student_id', auth.userId)
    .eq('semester', auth.current_semester)
    .eq('academic_year', settings.academic_year)
    .single()

  // Single pathway → auto-assign, resolve slots immediately
  if (pathways.length === 1) {
    const pathway = pathways[0]
    const resolved = await resolvePathwaySlots(pathway, auth, supabase, deptMap, deptIdToName)

    if (!resolved.success) {
      return { success: false, error: resolved.error, status: resolved.status }
    }

    const response: BlueprintResponse = {
      window_status: windowOpen ? 'OPEN' : 'CLOSED',
      deadline: settings.deadline ?? '',
      min_credits: blueprint.min_credits,
      max_credits: blueprint.max_credits,
      slots: resolved.slots,
      pathway_id: pathway.id,
    }

    return {
      success: true,
      student: {
        full_name: auth.full_name,
        current_semester: auth.current_semester,
      },
      data: response,
      ...(existingReg && { existing: existingReg })
    }
  }

  // Multiple pathways → return pathway list for picker
  const response: BlueprintResponse = {
    window_status: windowOpen ? 'OPEN' : 'CLOSED',
    deadline: settings.deadline ?? '',
    min_credits: blueprint.min_credits,
    max_credits: blueprint.max_credits,
    pathways: pathways.map(p => ({ id: p.id, name: p.name })),
  }

  return {
    success: true,
    student: {
      full_name: auth.full_name,
      current_semester: auth.current_semester,
    },
    data: response,
    ...(existingReg && { existing: existingReg })
  }
}
