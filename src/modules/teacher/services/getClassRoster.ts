import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function getClassRoster(courseId: string) {

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

  // Get logged in teacher
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Unauthorized', status: 401 }
  }

  // Verify teacher role
  const { data: teacher, error: teacherError } = await supabase
    .from('faculty')
    .select('role, campus_id')
    .eq('id', user.id)
    .single()

  if (teacherError || !teacher) {
    return { success: false, error: 'Faculty not found', status: 404 }
  }

  if (teacher.role !== 'teaching_staff') {
    return { success: false, error: 'Unauthorized', status: 403 }
  }
  
  // Get current academic year from campus settings
const { data: campusSettings } = await supabase
  .from('campus_settings')
  .select('academic_year')
  .eq('campus_id', teacher.campus_id)
  .single()

const academicYear = campusSettings?.academic_year ?? ''

  // Verify the course exists
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, title, course_code')
    .eq('id', courseId)
    .single()

  if (courseError || !course) {
    return { success: false, error: 'Course not found', status: 404 }
  }

  // Scan all 6 slots for this course ID
  const { data: registrations, error: regError } = await supabase
  .from('student_registrations')
  .select(`
    student_id,
    slot_1_course_id,
    slot_2_course_id,
    slot_3_course_id,
    slot_4_course_id,
    slot_5_course_id,
    slot_6_course_id
  `)
  .eq('academic_year', academicYear)
  .or(
    `slot_1_course_id.eq.${courseId},` +
    `slot_2_course_id.eq.${courseId},` +
    `slot_3_course_id.eq.${courseId},` +
    `slot_4_course_id.eq.${courseId},` +
    `slot_5_course_id.eq.${courseId},` +
    `slot_6_course_id.eq.${courseId}`
  )

  if (regError) {
    return { success: false, error: 'Failed to fetch registrations', status: 500 }
  }

  if (!registrations || registrations.length === 0) {
    return {
      success: true,
      data: {
        course,
        total_students: 0,
        department_breakdown: {},
        students: [],
      }
    }
  }

  // Get student IDs from registrations
  const studentIds = registrations.map(r => r.student_id)

  // Fetch student details with department names
  const { data: students, error: studentError } = await supabase
    .from('students')
    .select(`
      id,
      full_name,
      roll_number,
      departments (
        name,
        code
      )
    `)
    .in('id', studentIds)

  if (studentError || !students) {
    return { success: false, error: 'Failed to fetch student details', status: 500 }
  }

  // Build department breakdown stats
  const departmentBreakdown: Record<string, number> = {}

  students.forEach(student => {
    const deptName = (student.departments as any)?.name ?? 'Unknown'
    departmentBreakdown[deptName] = (departmentBreakdown[deptName] ?? 0) + 1
  })

  // Format final roster
  const roster = students.map(student => ({
    id: student.id,
    full_name: student.full_name,
    roll_number: student.roll_number,
    department: (student.departments as any)?.name ?? 'Unknown',
    department_code: (student.departments as any)?.code ?? '',
  }))

  return {
    success: true,
    data: {
      course,
      total_students: roster.length,
      department_breakdown: departmentBreakdown,
      students: roster,
    }
  }
}