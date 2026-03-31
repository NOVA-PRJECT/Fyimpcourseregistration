import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { SubmitCoursesInput } from '../schemas/submitSchema'

export async function submitCourses({ semester, courses }: SubmitCoursesInput) {

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
    .select('campus_id, current_semester')
    .eq('id', user.id)
    .single()

  if (studentError || !student) {
    return { success: false, error: 'Student not found', status: 404 }
  }

  // Verify submitted semester matches current semester
  if (semester !== student.current_semester) {
    return {
      success: false,
      error: 'Submitted semester does not match current semester',
      status: 400,
    }
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

  // Time check
  const now = new Date()
  const deadline = settings.deadline ? new Date(settings.deadline) : null
  const windowOpen = settings.registration_is_open && deadline && now < deadline

  if (!windowOpen) {
    return {
      success: false,
      error: 'Registration window is closed',
      status: 403,
    }
  }

  // Fetch credit values for submitted courses
  const { data: courseData, error: courseError } = await supabase
    .from('courses')
    .select('id, credits')
    .in('id', courses)

  if (courseError || !courseData) {
    return { success: false, error: 'Failed to fetch course data', status: 500 }
  }

  // Verify all submitted course IDs actually exist
  if (courseData.length !== courses.length) {
    return {
      success: false,
      error: 'One or more course IDs are invalid',
      status: 400,
    }
  }

  // Math engine — calculate total credits
  const totalCredits = courseData.reduce((sum, course) => sum + course.credits, 0)

  // Credits range check
  if (totalCredits < settings.min_credits) {
    return {
      success: false,
      error: `Total credits ${totalCredits} is below the minimum of ${settings.min_credits}`,
      status: 400,
    }
  }

  if (totalCredits > settings.max_credits) {
    return {
      success: false,
      error: `Total credits ${totalCredits} exceeds the maximum of ${settings.max_credits}`,
      status: 400,
    }
  }

  // Build the upsert payload
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

  // UPSERT — insert if new, update if already submitted
  const { error: upsertError } = await supabase
    .from('student_registrations')
    .upsert(payload, {
      onConflict: 'student_id, semester',
    })

  if (upsertError) {
    return {
      success: false,
      error: 'Failed to save registration',
      status: 500,
    }
  }

  return {
    success: true,
    message: 'Courses saved successfully',
    total_credits: totalCredits,
  }
}