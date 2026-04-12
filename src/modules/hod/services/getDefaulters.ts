import { supabaseAdmin } from '@/core/database/supabaseAdmin'

export async function getDefaulters(
  semester: number,
  department_id: string,
  campus_id: string
) {
  // Get current academic year from campus settings
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