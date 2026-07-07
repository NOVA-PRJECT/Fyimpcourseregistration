import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { SubmitCoursesInput } from '../schemas/submitSchema'
import { SLOT_RULES } from '@/core/constants/courseCategories'
import { supabaseAdmin } from '@/core/database/supabaseAdmin'


export async function submitCourses({ semester, courses }: SubmitCoursesInput) {

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) =>
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          ),
      },
    }
  )

  // 1. Get logged in student
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized', status: 401 }

  // M3 fix: Server-side duplicate course check (defense against schema bypass)
  if (new Set(courses).size !== courses.length) {
    return { success: false, error: 'Duplicate courses detected', status: 400 }
  }

  // 2. Get student details
  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('campus_id, department_id, current_semester')
    .eq('id', user.id)
    .single()

  if (studentError || !student) {
    return { success: false, error: 'Student not found', status: 404 }
  }

  // 3. Verify submitted semester matches current semester
  if (semester !== student.current_semester) {
    return {
      success: false,
      error: 'Submitted semester does not match your current semester',
      status: 400,
    }
  }

  // 4. Parallel fetch: campus settings + blueprint + all departments
  const [
    { data: settings, error: settingsError },
    { data: blueprint, error: blueprintError },
    { data: departments },
  ] = await Promise.all([
    supabase
      .from('campus_settings')
      .select('deadline, min_credits, max_credits, academic_year')
      .eq('campus_id', student.campus_id)
      .single(),
    supabase
      .from('semester_blueprints')
      .select('*')
      .eq('department_id', student.department_id)
      .eq('semester', semester)
      .single(),
    supabase
      .from('departments')
      .select('id, code'),
  ])

  if (settingsError || !settings) {
    return { success: false, error: 'Campus settings not found', status: 404 }
  }

  // 5. Check registration window
  const now = new Date()
  const deadline = settings.deadline ? new Date(settings.deadline) : null
  const windowOpen = deadline !== null && now < deadline

  if (!windowOpen) {
    return { success: false, error: 'Registration window is closed', status: 403 }
  }

  if (blueprintError || !blueprint) {
    return { success: false, error: 'No blueprint found for your semester', status: 404 }
  }

  // 6. Build slot definitions from blueprint
  const slots = Array.from({ length: 6 }, (_, i) => ({
    slot: i + 1,
    rule: blueprint[`slot_${i + 1}_rule`] as string | null,
    target: blueprint[`slot_${i + 1}_target`] as string | null,
  })).filter(s => s.rule) // only defined slots

  // 7. Validate course count matches defined slots
  if (courses.length !== slots.length) {
    return {
      success: false,
      error: `Expected ${slots.length} courses for this semester, got ${courses.length}`,
      status: 400,
    }
  }

  // 8. Fetch full details of all submitted courses in one query
  const { data: courseData, error: courseError } = await supabase
    .from('courses')
    .select('id, course_code, credits, category, tag, department_id, semester')
    .in('id', courses)

  if (courseError || !courseData) {
    return { success: false, error: 'Failed to fetch course data', status: 500 }
  }

  if (courseData.length !== courses.length) {
    return { success: false, error: 'One or more course IDs are invalid', status: 400 }
  }

  // Build dept code → id map for rule validation
  const deptMap = new Map(departments?.map(d => [d.code, d.id]) ?? [])

  // Build course lookup by id
  const courseMap = new Map(courseData.map(c => [c.id, c]))

  // 9. Validate each course against its blueprint slot rule
  for (let i = 0; i < slots.length; i++) {
    const { slot, rule, target } = slots[i]
    const courseId = courses[i]
    const course = courseMap.get(courseId)

    if (!course) {
      return { success: false, error: `Invalid course in slot ${slot}`, status: 400 }
    }

    // FIXED — must match the exact course code
    if (rule === SLOT_RULES.FIXED) {
      if (course.course_code !== target) {
        return {
          success: false,
          error: `Slot ${slot} requires a fixed course and cannot be changed`,
          status: 400,
        }
      }
      continue
    }

    // DEPT_RESTRICTED — must come from specific department, DSC or DSE only
    if (rule === SLOT_RULES.DEPT_RESTRICTED) {
      const requiredDeptId = deptMap.get(target ?? '')
      if (course.department_id !== requiredDeptId) {
        return {
          success: false,
          error: `Slot ${slot} requires a course from a specific department`,
          status: 400,
        }
      }
      if (!['DSC', 'DSE'].includes(course.category)) {
        return {
          success: false,
          error: `Slot ${slot} requires a DSC or DSE category course`,
          status: 400,
        }
      }
      continue
    }

    // EXCLUDE_DEPT — must NOT come from specific department, DSC or DSE only
    if (rule === SLOT_RULES.EXCLUDE_DEPT) {
      const excludedDeptId = deptMap.get(target ?? '')
      if (course.department_id === excludedDeptId) {
        return {
          success: false,
          error: `Slot ${slot} does not allow courses from that department`,
          status: 400,
        }
      }
      if (!['DSC', 'DSE'].includes(course.category)) {
        return {
          success: false,
          error: `Slot ${slot} requires a DSC or DSE category course`,
          status: 400,
        }
      }
      continue
    }

    // POOL_RESTRICTED — must come from student's own dept, matching tag
    if (rule === SLOT_RULES.POOL_RESTRICTED) {
      if (course.department_id !== student.department_id) {
        return {
          success: false,
          error: `Slot ${slot} requires a course from your own department`,
          status: 400,
        }
      }
      if (course.tag !== target) {
        return {
          success: false,
          error: `Slot ${slot} requires a course from pool "${target}"`,
          status: 400,
        }
      }
      continue
    }

    // GLOBAL_BASKET — must match tag; if MDC, must exclude student's own dept
    if (rule === SLOT_RULES.GLOBAL_BASKET) {
      if (course.tag !== target) {
        return {
          success: false,
          error: `Slot ${slot} requires a course with tag "${target}"`,
          status: 400,
        }
      }
      if (target?.includes('MDC') && course.department_id === student.department_id) {
        return {
          success: false,
          error: `Slot ${slot} requires a course from a different department`,
          status: 400,
        }
      }
      continue
    }
  }

  // 10. Calculate total credits
  const totalCredits = courseData.reduce((sum, c) => sum + c.credits, 0)

  if (totalCredits < settings.min_credits) {
    return {
      success: false,
      error: `Total credits (${totalCredits}) is below the minimum of ${settings.min_credits}`,
      status: 400,
    }
  }

  if (totalCredits > settings.max_credits) {
    return {
      success: false,
      error: `Total credits (${totalCredits}) exceeds the maximum of ${settings.max_credits}`,
      status: 400,
    }
  }

  // 11. Build upsert payload — slot assignment follows blueprint order
  const payload: Record<string, unknown> = {
    student_id: user.id,
    campus_id: student.campus_id,
    semester,
    academic_year: settings.academic_year,
    total_credits: totalCredits,
    submitted_at: new Date().toISOString(),
    slot_1_course_id: courses[0] ?? null,
    slot_2_course_id: courses[1] ?? null,
    slot_3_course_id: courses[2] ?? null,
    slot_4_course_id: courses[3] ?? null,
    slot_5_course_id: courses[4] ?? null,
    slot_6_course_id: courses[5] ?? null,
  }

  // 12. Upsert via supabaseAdmin — student_registrations RLS denies direct client writes
  const { error: upsertError } = await supabaseAdmin
    .from('student_registrations')
    .upsert(payload, { onConflict: 'student_id,semester,academic_year'})


  if (upsertError) {
    console.error('submitCourses — upsert failed:', upsertError)
    return { success: false, error: 'Failed to save registration', status: 500 }
  }

  return {
    success: true,
    message: 'Courses submitted successfully',
    total_credits: totalCredits,
  }
}
