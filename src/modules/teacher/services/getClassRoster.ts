import { supabaseAdmin } from '@/core/database/supabaseAdmin'

export async function getClassRoster(courseId: string, campus_id: string) {

  const { data: campusSettings } = await supabaseAdmin
    .from('campus_settings')
    .select('academic_year')
    .eq('campus_id', campus_id)
    .single()

  const academicYear = campusSettings?.academic_year ?? ''

  const { data: course, error: courseError } = await supabaseAdmin
    .from('courses')
    .select('id, title, course_code, department_id')
    .eq('id', courseId)
    .single()

  if (courseError || !course) {
    return { success: false, error: 'Course not found', status: 404 }
  }

  // C3 fix: Verify the course belongs to a department within the teacher's campus
  const { data: courseDept } = await supabaseAdmin
    .from('departments')
    .select('campus_id')
    .eq('id', course.department_id)
    .single()

  if (!courseDept || courseDept.campus_id !== campus_id) {
    return { success: false, error: 'Course does not belong to your campus', status: 403 }
  }

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

  const departmentBreakdown: Record<string, number> = {}
  students.forEach(student => {
    const deptName = (student.departments as any)?.name ?? 'Unknown'
    departmentBreakdown[deptName] = (departmentBreakdown[deptName] ?? 0) + 1
  })

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