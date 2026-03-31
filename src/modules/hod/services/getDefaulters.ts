import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function getDefaulters(semester: number) {

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

  // Get logged in HOD
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Unauthorized — no user in session', status: 401 }
  }

  // Get HOD details
  const { data: hod, error: hodError } = await supabase
    .from('faculty')
    .select('department_id, campus_id, role')
    .eq('id', user.id)
    .single()

  if (hodError || !hod) {
    return { 
      success: false, 
      error: `HOD fetch failed: ${JSON.stringify(hodError)}`, 
      status: 404 
    }
  }

  if (hod.role !== 'hod') {
    return { 
      success: false, 
      error: `Role mismatch — found role: ${hod.role}`, 
      status: 403 
    }
  }

  if (!hod.department_id) {
    return { 
      success: false, 
      error: 'HOD has no department assigned', 
      status: 400 
    }
  }
  // Get current academic year from campus settings
const { data: campusSettings } = await supabase
  .from('campus_settings')
  .select('academic_year')
  .eq('campus_id', hod.campus_id)
  .single()

const academicYear = campusSettings?.academic_year ?? ''

  // Query 1 — ALL students in this department + campus + semester
  const { data: allStudents, error: allError } = await supabase
    .from('students')
    .select('id, full_name, roll_number')
    .eq('department_id', hod.department_id)
    .eq('campus_id', hod.campus_id)
    .eq('current_semester', semester)

  if (allError) {
    return { 
      success: false, 
      error: `Students fetch failed: ${JSON.stringify(allError)} | dept: ${hod.department_id} | campus: ${hod.campus_id}`, 
      status: 500 
    }
  }

  if (!allStudents || allStudents.length === 0) {
    return {
      success: true,
      data: {
        total_students: 0,
        submitted_count: 0,
        defaulter_count: 0,
        defaulters: [],
        debug: `No students found in dept ${hod.department_id} campus ${hod.campus_id} semester ${semester}`,
      }
    }
  }

  // Query 2 — Students who HAVE submitted registrations
  const { data: submitted, error: submittedError } = await supabase
  .from('student_registrations')
  .select('student_id')
  .eq('semester', semester)
  .eq('academic_year', academicYear)
  .in('student_id', allStudents.map(s => s.id))

  if (submittedError) {
    return { 
      success: false, 
      error: `Registrations fetch failed: ${JSON.stringify(submittedError)}`, 
      status: 500 
    }
  }

  // Subtract — find students who have NOT submitted
  const submittedIds = new Set(submitted?.map(r => r.student_id) ?? [])
  const defaulters = allStudents.filter(s => !submittedIds.has(s.id))

  return {
    success: true,
    data: {
      total_students: allStudents.length,
      submitted_count: submitted?.length ?? 0,
      defaulter_count: defaulters.length,
      defaulters,
    }
  }
}
