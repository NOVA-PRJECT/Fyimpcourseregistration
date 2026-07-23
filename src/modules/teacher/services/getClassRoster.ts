import { supabaseAdmin } from '@/core/database/supabaseAdmin'
import { logServerError } from '@/core/logging/logger'
import { z } from 'zod'

export async function getClassRoster(courseId: string, campus_id: string) {
  if (!z.string().uuid().safeParse(courseId).success) {
    return { success: false, error: 'Invalid course ID format', status: 400 }
  }

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

  const slotFields = [
    'slot_1_course_id',
    'slot_2_course_id',
    'slot_3_course_id',
    'slot_4_course_id',
    'slot_5_course_id',
    'slot_6_course_id',
  ]
  const orClause = slotFields.map(field => `${field}.eq.${courseId}`).join(',')

  const { data: registrations, error: regError } = await supabaseAdmin
    .from('student_registrations')
    .select(`
      student_id,
      pathway_id,
      slot_1_course_id,
      slot_2_course_id,
      slot_3_course_id,
      slot_4_course_id,
      slot_5_course_id,
      slot_6_course_id
    `)
    .eq('academic_year', academicYear)
    .or(orClause)

  if (regError) {
    logServerError('getClassRoster', regError, { courseId, campus_id, step: 'registrations_fetch' })
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

  const studentIds = registrations.map((r: any) => r.student_id)

  // Build student → pathway_id map
  const studentPathwayMap = new Map(
    registrations.map((r: any) => [r.student_id, r.pathway_id ?? null])
  )

  const { data: students, error: studentError } = await supabaseAdmin
    .from('students')
    .select(`
      id,
      full_name,
      departments (
        name,
        code
      )
    `)
    .in('id', studentIds)

  if (studentError || !students) {
    logServerError('getClassRoster', studentError, { courseId, campus_id, step: 'student_details_fetch' })
    return { success: false, error: 'Failed to fetch student details', status: 500 }
  }

  interface StudentWithDept {
    id: string
    full_name: string
    departments: { name: string; code: string } | null
  }

  const typedStudents = students as unknown as StudentWithDept[]

  const departmentBreakdown: Record<string, number> = {}
  typedStudents.forEach((student) => {
    const deptName = student.departments?.name ?? 'Unknown'
    departmentBreakdown[deptName] = (departmentBreakdown[deptName] ?? 0) + 1
  })

  const roster = typedStudents.map((student) => ({
    id: student.id,
    full_name: student.full_name,
    department: student.departments?.name ?? 'Unknown',
    department_code: student.departments?.code ?? '',
    pathway: studentPathwayMap.get(student.id) ?? 'Default',
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