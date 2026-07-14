import { supabaseAdmin } from '@/core/database/supabaseAdmin'
import { logServerError } from '@/core/logging/logger'



// ── getAllDepartmentStudents: full department across ALL semesters ──
// Each student is tagged with their registration status for their own current_semester
export async function getAllDepartmentStudents(
  department_id: string,
  campus_id: string,
  semesterFilter?: number // optional narrowing
) {
  let studentsQuery = supabaseAdmin
    .from('students')
    .select('id, full_name, roll_number, current_semester')
    .eq('department_id', department_id)
    .eq('campus_id', campus_id)
    .order('current_semester', { ascending: true })
    .order('full_name', { ascending: true })

  if (semesterFilter !== undefined) {
    studentsQuery = studentsQuery.eq('current_semester', semesterFilter) as typeof studentsQuery
  }

  // Parallel fetch: campus settings and students list
  const [settingsRes, studentsRes] = await Promise.all([
    supabaseAdmin
      .from('campus_settings')
      .select('academic_year')
      .eq('campus_id', campus_id)
      .single(),
    studentsQuery
  ])

  const academicYear = settingsRes.data?.academic_year ?? ''
  const { data: students, error } = studentsRes

  if (error) {
    logServerError('getAllDepartmentStudents', error, { department_id, campus_id, semesterFilter })
    return { success: false, error: 'Failed to fetch students', status: 500 }
  }

  if (!students || students.length === 0) {
    return {
      success: true,
      data: {
        academic_year: academicYear,
        total_students: 0,
        submitted_count: 0,
        students: [],
      },
    }
  }

  // Get all registrations for this academic year for these students
  const { data: registrations, error: regError } = await supabaseAdmin
    .from('student_registrations')
    .select('student_id, semester')
    .eq('academic_year', academicYear)
    .in('student_id', students.map((s: any) => s.id))

  if (regError) {
    logServerError('getAllDepartmentStudents', regError, { department_id, campus_id, academicYear })
    return { success: false, error: 'Failed to fetch registration data', status: 500 }
  }

  // Build set of submitted: "student_id:semester"
  const submittedSet = new Set(
    (registrations ?? []).map((r: any) => `${r.student_id}:${r.semester}`)
  )

  const enriched = students.map((s: any) => ({
    id: s.id,
    full_name: s.full_name,
    roll_number: s.roll_number,
    current_semester: s.current_semester,
    submitted: submittedSet.has(`${s.id}:${s.current_semester}`),
  }))

  const submittedCount = enriched.filter((s: any) => s.submitted).length

  return {
    success: true,
    data: {
      academic_year: academicYear,
      total_students: enriched.length,
      submitted_count: submittedCount,
      students: enriched,
    },
  }
}