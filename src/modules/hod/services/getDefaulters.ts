import { supabaseAdmin } from '@/core/database/supabaseAdmin'

// ── getDefaulters: single-semester (kept for backwards compat) ──
export async function getDefaulters(
  semester: number,
  department_id: string,
  campus_id: string
) {
  const { data: campusSettings } = await supabaseAdmin
    .from('campus_settings')
    .select('academic_year')
    .eq('campus_id', campus_id)
    .single()

  const academicYear = campusSettings?.academic_year ?? ''

  const { data: allStudents, error: allError } = await supabaseAdmin
    .from('students')
    .select('id, full_name, roll_number')
    .eq('department_id', department_id)
    .eq('campus_id', campus_id)
    .eq('current_semester', semester)

  if (allError) {
    return { success: false, error: 'Failed to fetch students', status: 500 }
  }

  if (!allStudents || allStudents.length === 0) {
    return { success: true, data: { total_students: 0, submitted_count: 0, defaulter_count: 0, defaulters: [] } }
  }

  const { data: submitted } = await supabaseAdmin
    .from('student_registrations')
    .select('student_id')
    .eq('semester', semester)
    .eq('academic_year', academicYear)
    .in('student_id', allStudents.map((s: any) => s.id))

  const submittedIds = new Set(submitted?.map((r: any) => r.student_id) ?? [])
  const defaulters = allStudents.filter((s: any) => !submittedIds.has(s.id))

  return {
    success: true,
    data: {
      total_students: allStudents.length,
      submitted_count: submitted?.length ?? 0,
      defaulter_count: defaulters.length,
      defaulters,
    },
  }
}

// ── getAllDepartmentStudents: full department across ALL semesters ──
// Each student is tagged with their registration status for their own current_semester
export async function getAllDepartmentStudents(
  department_id: string,
  campus_id: string,
  semesterFilter?: number // optional narrowing
) {
  const { data: campusSettings } = await supabaseAdmin
    .from('campus_settings')
    .select('academic_year')
    .eq('campus_id', campus_id)
    .single()

  const academicYear = campusSettings?.academic_year ?? ''

  let query = supabaseAdmin
    .from('students')
    .select('id, full_name, roll_number, current_semester')
    .eq('department_id', department_id)
    .eq('campus_id', campus_id)
    .order('current_semester', { ascending: true })
    .order('full_name', { ascending: true })

  if (semesterFilter !== undefined) {
    query = query.eq('current_semester', semesterFilter) as typeof query
  }

  const { data: students, error } = await query

  if (error) {
    console.error('getAllDepartmentStudents — students fetch failed:', error)
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
    console.error('getAllDepartmentStudents — registrations fetch failed:', regError)
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