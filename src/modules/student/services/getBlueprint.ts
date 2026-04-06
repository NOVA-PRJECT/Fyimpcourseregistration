
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { SLOT_RULES } from '@/core/constants/courseCategories'
import { BlueprintSlot, BlueprintResponse } from '@/core/types/course.types'

export async function getBlueprint() {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  // 1. Get logged in student
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized', status: 401 }

  // 2. Get student details
  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('department_id, campus_id, current_semester')
    .eq('id', user.id)
    .single()

  if (studentError || !student) {
    return { success: false, error: 'Student not found', status: 404 }
  }

  // 3. PARALLEL FETCH: Settings, Blueprint, and all Departments
  const [
    { data: settings, error: settingsError },
    { data: blueprint, error: blueprintError },
    { data: departmentsData }
  ] = await Promise.all([
    supabase
      .from('campus_settings')
      .select('registration_is_open, deadline, min_credits, max_credits, academic_year')
      .eq('campus_id', student.campus_id)
      .single(),
    supabase
      .from('semester_blueprints')
      .select('*')
      .eq('department_id', student.department_id)
      .eq('semester', student.current_semester)
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
  const windowOpen = settings.registration_is_open && deadline && now < deadline

  // Build department name → id map for O(1) lookup
  const deptMap = new Map(departmentsData?.map(d => [d.code, d.id]) || [])

  // 4. PRE-FLIGHT: Identify all slots and batch-fetch FIXED courses
  const slotsInfo = Array.from({ length: 6 }).map((_, i) => ({
    slot: i + 1,
    rule: blueprint[`slot_${i + 1}_rule`],
    target: blueprint[`slot_${i + 1}_target`],
    name: blueprint[`slot_${i + 1}_name`] ?? `Paper ${i + 1}`
  })).filter(s => s.rule && s.target)

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

  // 5. FINAL PARALLEL PASS: existing registration + all slot queries simultaneously
  const [existingRegistrationRes, ...resolvedSlots] = await Promise.all([

    // Check if student already submitted this semester
    supabase
      .from('student_registrations')
      .select('slot_1_course_id, slot_2_course_id, slot_3_course_id, slot_4_course_id, slot_5_course_id, slot_6_course_id')
      .eq('student_id', user.id)
      .eq('semester', student.current_semester)
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
        query = query.not('id', 'in', `(${fixedCourseIds.join(',')})`)
      }

      // DEPT_RESTRICTED
      // Student picks a DSC or DSE paper from one specific named department
      // Target = department name e.g. "Mathematical Sciences"
      if (rule === SLOT_RULES.DEPT_RESTRICTED) {
        const deptId = deptMap.get(target)
        if (!deptId) return { slot, rule, name, options: [] }

        const { data: options } = await query
          .eq('department_id', deptId)
          .eq('semester', student.current_semester)
          .in('category', ['DSC', 'DSE'])

        return { slot, rule, name, options: options ?? [] }
      }

      // EXCLUDE_DEPT
      // Student picks a DSC or DSE paper from any department EXCEPT the specified one
      // Target = department name to exclude e.g. "Mathematical Sciences"
      if (rule === SLOT_RULES.EXCLUDE_DEPT) {
        const deptId = deptMap.get(target)
        if (!deptId) return { slot, rule, name, options: [] }

        const { data: options } = await query
          .neq('department_id', deptId)
          .eq('semester', student.current_semester)
          .in('category', ['DSC', 'DSE'])

        return { slot, rule, name, options: options ?? [] }
      }

      // POOL_RESTRICTED
      // Student picks from their OWN department's courses matching the tag
      // Used for internal department elective pools e.g. POOL-A, POOL-B
      // Target = pool tag e.g. "POOL-A"
      if (rule === SLOT_RULES.POOL_RESTRICTED) {
        const { data: options } = await query
          .eq('department_id', student.department_id)
          .eq('tag', target)

        return { slot, rule, name, options: options ?? [] }
      }

      // GLOBAL_BASKET
      // Student picks from ANY department EXCEPT their own, matching the tag
      // Used for cross-department pools like MDC
      // Student cannot pick their own department's tagged papers
      // Target = tag e.g. "MDC-1"
      if (rule === SLOT_RULES.GLOBAL_BASKET) {
  let q = query.eq('tag', target)

  // If target contains "MDC", exclude student's department
  if (target.includes("MDC")) {
    q = q.neq('department_id', student.department_id)
  }

  const { data: options } = await q

  return { slot, rule, name, options: options ?? [] }
}

      // Unknown rule — return empty safely
      return { slot, rule, name, options: [] }
    })
  ])

  const response: BlueprintResponse = {
    window_status: windowOpen ? 'OPEN' : 'CLOSED',
    deadline: settings.deadline ?? '',
    min_credits: blueprint.min_credits,
    max_credits: blueprint.max_credits,
    slots: resolvedSlots as BlueprintSlot[],
  }

  return {
    success: true,
    data: response,
    ...(existingRegistrationRes.data && { existing: existingRegistrationRes.data })
  }
}
