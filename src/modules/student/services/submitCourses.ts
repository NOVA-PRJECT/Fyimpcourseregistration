import { SubmitCoursesInput } from '../schemas/submitSchema'
import { SLOT_RULES } from '@/core/constants/courseCategories'
import { supabaseAdmin } from '@/core/database/supabaseAdmin'
import { getSupabaseServerClient } from '@/core/database/supabaseClient'
import { VerifiedStudent } from '@/core/auth/verifyRole'
import { isCourseEligibleForSlot } from '@/core/utils/slotRules'
import { logServerError } from '@/core/logging/logger'

export async function submitCourses(auth: VerifiedStudent, { semester, courses }: SubmitCoursesInput) {
  const supabase = await getSupabaseServerClient()

  // M3 fix: Server-side duplicate course check (defense against schema bypass)
  if (new Set(courses).size !== courses.length) {
    return { success: false, error: 'Duplicate courses detected', status: 400 }
  }

  // Verify submitted semester matches current semester
  if (semester !== auth.current_semester) {
    return {
      success: false,
      error: 'Submitted semester does not match your current semester',
      status: 400,
    }
  }

  // Parallel fetch: campus settings + blueprint + all departments
  const [
    { data: settings, error: settingsError },
    { data: blueprint, error: blueprintError },
    { data: departments },
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
      .eq('semester', semester)
      .single(),
    supabase
      .from('departments')
      .select('id, code'),
  ])

  if (settingsError || !settings) {
    return { success: false, error: 'Campus settings not found', status: 404 }
  }

  // Check registration window
  const now = new Date()
  const deadline = settings.deadline ? new Date(settings.deadline) : null
  const windowOpen = deadline !== null && now < deadline

  if (!windowOpen) {
    return { success: false, error: 'Registration window is closed', status: 403 }
  }

  if (blueprintError || !blueprint) {
    return { success: false, error: 'No blueprint found for your semester', status: 404 }
  }

  // Build slot definitions from blueprint
  const slots = Array.from({ length: 6 }, (_, i) => ({
    slot: i + 1,
    rule: blueprint[`slot_${i + 1}_rule`] as string | null,
    target: blueprint[`slot_${i + 1}_target`] as string | null,
  })).filter(s => s.rule) // only defined slots

  // Validate course count matches defined slots
  if (courses.length !== slots.length) {
    return {
      success: false,
      error: `Expected ${slots.length} courses for this semester, got ${courses.length}`,
      status: 400,
    }
  }

  // Fetch full details of all submitted courses in one query
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

  // Validate each course against its blueprint slot rule
  for (let i = 0; i < slots.length; i++) {
    const { slot, rule, target } = slots[i]
    const courseId = courses[i]
    const course = courseMap.get(courseId)

    if (!course) {
      return { success: false, error: `Invalid course in slot ${slot}`, status: 400 }
    }

    if (!rule || !target) continue

    const isEligible = isCourseEligibleForSlot(
      course,
      rule,
      target,
      auth.department_id,
      deptMap
    )

    if (!isEligible) {
      // Return the specific detailed error messages to keep user experience identical
      if (rule === SLOT_RULES.FIXED) {
        return {
          success: false,
          error: `Slot ${slot} requires a fixed course and cannot be changed`,
          status: 400,
        }
      }
      if (rule === SLOT_RULES.DEPT_RESTRICTED) {
        const requiredDeptId = deptMap.get(target)
        if (course.department_id !== requiredDeptId) {
          return {
            success: false,
            error: `Slot ${slot} requires a course from a specific department`,
            status: 400,
          }
        }
        return {
          success: false,
          error: `Slot ${slot} requires a DSC or DSE category course`,
          status: 400,
        }
      }
      if (rule === SLOT_RULES.EXCLUDE_DEPT) {
        const excludedDeptId = deptMap.get(target)
        if (course.department_id === excludedDeptId) {
          return {
            success: false,
            error: `Slot ${slot} does not allow courses from that department`,
            status: 400,
          }
        }
        return {
          success: false,
          error: `Slot ${slot} requires a DSC or DSE category course`,
          status: 400,
        }
      }
      if (rule === SLOT_RULES.POOL_RESTRICTED) {
        if (course.department_id !== auth.department_id) {
          return {
            success: false,
            error: `Slot ${slot} requires a course from your own department`,
            status: 400,
          }
        }
        return {
          success: false,
          error: `Slot ${slot} requires a course from pool "${target}"`,
          status: 400,
        }
      }
      if (rule === SLOT_RULES.GLOBAL_BASKET) {
        if (course.tag !== target) {
          return {
            success: false,
            error: `Slot ${slot} requires a course with tag "${target}"`,
            status: 400,
          }
        }
        return {
          success: false,
          error: `Slot ${slot} requires a course from a different department`,
          status: 400,
        }
      }
      return { success: false, error: `Invalid course for slot ${slot}`, status: 400 }
    }
  }

  // Calculate total credits
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

  // Build upsert payload — slot assignment follows blueprint order
  const payload: Record<string, unknown> = {
    student_id: auth.userId,
    campus_id: auth.campus_id,
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

  // Upsert via supabaseAdmin — student_registrations RLS denies direct client writes
  const { error: upsertError } = await supabaseAdmin
    .from('student_registrations')
    .upsert(payload, { onConflict: 'student_id,semester,academic_year'})

  if (upsertError) {
    logServerError('submitCourses', upsertError, { userId: auth.userId, academicYear: settings.academic_year, semester })
    return { success: false, error: 'Failed to save registration', status: 500 }
  }

  return {
    success: true,
    message: 'Courses submitted successfully',
    total_credits: totalCredits,
  }
}
