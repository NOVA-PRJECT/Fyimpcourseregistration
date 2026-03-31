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
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  // Get logged in student
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Unauthorized', status: 401 }
  }

  // Get student details
  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('department_id, campus_id, current_semester')
    .eq('id', user.id)
    .single()

  if (studentError || !student) {
    return { success: false, error: 'Student not found', status: 404 }
  }

  // Check registration window
  const { data: settings, error: settingsError } = await supabase
  .from('campus_settings')
  .select('registration_is_open, deadline, min_credits, max_credits, academic_year')
  .eq('campus_id', student.campus_id)
  .single()


  if (settingsError || !settings) {
    return { success: false, error: 'Campus settings not found', status: 404 }
  }

  // Check if deadline has passed
  const now = new Date()
  const deadline = settings.deadline ? new Date(settings.deadline) : null
  const windowOpen = settings.registration_is_open && deadline && now < deadline

  // Check if student already submitted
  const { data: existingRegistration } = await supabase
  .from('student_registrations')
  .select('slot_1_course_id, slot_2_course_id, slot_3_course_id, slot_4_course_id, slot_5_course_id, slot_6_course_id')
  .eq('student_id', user.id)
  .eq('semester', student.current_semester)
  .eq('academic_year', settings.academic_year)
  .single()

  // Fetch blueprint for this department + semester
  const { data: blueprint, error: blueprintError } = await supabase
    .from('semester_blueprints')
    .select('*')
    .eq('department_id', student.department_id)
    .eq('semester', student.current_semester)
    .single()

  if (blueprintError || !blueprint) {
    return { success: false, error: 'Blueprint not found for this semester', status: 404 }
  }

  // ── FIRST PASS — collect all FIXED course IDs ──
  const fixedCourseIds: string[] = []

  for (let i = 1; i <= 6; i++) {
    const rule = blueprint[`slot_${i}_rule`]
    const target = blueprint[`slot_${i}_target`]

    if (rule === SLOT_RULES.FIXED && target) {
      const { data: fixedCourse } = await supabase
        .from('courses')
        .select('id')
        .eq('course_code', target)
        .single()

      if (fixedCourse) {
        fixedCourseIds.push(fixedCourse.id)
      }
    }
  }

  // ── SECOND PASS — resolve all slots ──
  const slots: BlueprintSlot[] = []

  for (let i = 1; i <= 6; i++) {
    const rule = blueprint[`slot_${i}_rule`]
    const target = blueprint[`slot_${i}_target`]
    const name = blueprint[`slot_${i}_name`] ?? `Paper ${i}`

    // Skip empty slots
    if (!rule || !target) continue

    if (rule === SLOT_RULES.FIXED) {
      // Single locked course — fetch by course_code
      const { data: course } = await supabase
        .from('courses')
        .select('id, course_code, title, department_id, semester, credits, category, tag')
        .eq('course_code', target)
        .single()

      slots.push({ slot: i, rule, name, course: course ?? undefined })

    } else {
      // Build base query excluding all fixed course IDs
      let query = supabase
        .from('courses')
        .select('id, course_code, title, department_id, semester, credits, category, tag')

      if (fixedCourseIds.length > 0) {
        query = query.not('id', 'in', `(${fixedCourseIds.join(',')})`)
      }

      if (rule === SLOT_RULES.DEPT_RESTRICTED) {
        // Courses from a specific department — exclude tagged courses
        const { data: dept } = await supabase
          .from('departments')
          .select('id')
          .eq('name', target)
          .single()

        if (dept) {
          const { data: options } = await query
            .eq('department_id', dept.id)
            .eq('semester', student.current_semester)
            .is('tag', null)

          slots.push({ slot: i, rule, name, options: options ?? [] })
        }

      } else if (rule === SLOT_RULES.EXCLUDE_DEPT) {
        // Courses from any department except the target — exclude tagged courses
        const { data: dept } = await supabase
          .from('departments')
          .select('id')
          .eq('name', target)
          .single()

        if (dept) {
          const { data: options } = await query
            .neq('department_id', dept.id)
            .eq('semester', student.current_semester)
            .is('tag', null)

          slots.push({ slot: i, rule, name, options: options ?? [] })
        }

      } else if (rule === SLOT_RULES.POOL_RESTRICTED) {
        // Courses tagged with this pool name
        const { data: options } = await query.eq('tag', target)
        slots.push({ slot: i, rule, name, options: options ?? [] })

      } else if (rule === SLOT_RULES.GLOBAL_BASKET) {
        // Courses matching this tag e.g. 'MDC-1', 'AEC-2'
        const { data: options } = await query.eq('tag', target)
        slots.push({ slot: i, rule, name, options: options ?? [] })
      }
    }
  }

  const response: BlueprintResponse = {
    window_status: windowOpen ? 'OPEN' : 'CLOSED',
    deadline: settings.deadline ?? '',
    min_credits: blueprint.min_credits,
    max_credits: blueprint.max_credits,
    slots,
  }

  // If student already submitted, attach their previous choices
  if (existingRegistration) {
    return {
      success: true,
      data: response,
      existing: existingRegistration,
    }
  }

  return { success: true, data: response }
}
