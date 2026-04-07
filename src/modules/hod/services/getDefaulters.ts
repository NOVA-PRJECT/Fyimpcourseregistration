import { supabaseAdmin } from '@/core/database/supabaseAdmin'
import { verifyHod } from '@/core/auth/verifyRole'

export async function getDefaulters(semester: number) {

  // Auth — verified HOD only
  const auth = await verifyHod()
  if (!auth.success) {
    return { success: false, error: auth.error, status: auth.status }
  }

  const { department_id, campus_id } = auth

  // Get current academic year from campus settings
  const { data: campusSettings } = await supabaseAdmin
    .from('campus_settings')
    .select('academic_year')
    .eq('campus_id', campus_id)
    .single()

  const academicYear = campusSettings?.academic_year ?? ''

  // Query 1 — all students in this department + campus + semester
  const { data: allStudents, error: allError } = await supabaseAdmin
    .from('students')
    .select('id, full_name, roll_number')
    .eq('department_id', department_id)
    .eq('campus_id', campus_id)
    .eq('current_semester', semester)

  if (allError) {
    console.error('getDefaulters — students fetch failed:', allError)
    return { success: false, error: 'Failed to fetch students', status: 500 }
  }

  if (!allStudents || allStudents.length === 0) {
    return {
      success: true,
      data: {
        total_students: 0,
        submitted_count: 0,
        defaulter_count: 0,
        defaulters: [],
      },
    }
  }

  // Query 2 — students who HAVE submitted registrations this academic year
  const { data: submitted, error: submittedError } = await supabaseAdmin
    .from('student_registrations')
    .select('student_id')
    .eq('semester', semester)
    .eq('academic_year', academicYear)
    .in('student_id', allStudents.map(s => s.id))

  if (submittedError) {
    console.error('getDefaulters — registrations fetch failed:', submittedError)
    return { success: false, error: 'Failed to fetch registration data', status: 500 }
  }

  // Subtract — students who have NOT submitted
  const submittedIds = new Set(submitted?.map(r => r.student_id) ?? [])
  const defaulters = allStudents.filter(s => !submittedIds.has(s.id))

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
