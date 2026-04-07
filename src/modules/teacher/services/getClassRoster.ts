import { supabaseAdmin } from '@/core/database/supabaseAdmin'
import { verifyTeacher } from '@/core/auth/verifyRole'

export async function getClassRoster(courseId: string) {

  // Auth — verified teaching_staff only
  const auth = await verifyTeacher()
  if (!auth.success) {
    return { success: false, error: auth.error, status: auth.status }
  }

  const { campus_id } = auth

  // Get current academic year from campus settings
  const { data: campusSettings } = await supabaseAdmin
    .from('campus_settings')
    .select('academic_year')
    .eq('campus_id', campus_id)
    .single()

  const academicYear = campusSettings?.academic_year ?? ''

  // Verify the course exists
  const { data: course, error: courseError } = await supabaseAdmin
    .from('courses')
    .select('id, title, course_code')
    .eq('id', courseId)
    .single()

  if (courseError || !course) {
    return { success: false, error: 'Course not found', status: 404 }
  }

  // Scan all 6 slots for this course ID
  const { data: registrations, error: regError } = await supabaseAdmin
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
    console.error('getClassRoster — registrations fetch failed:', regError)
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
      },
    }
  }

  const studentIds = registrations.map(r => r.student_id)

  // Fetch student details with department names
  const { data: students, error: studentError } = await supabaseAdmin
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
    console.error('getClassRoster — student details fetch failed:', studentError)
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
    },
  }
}
