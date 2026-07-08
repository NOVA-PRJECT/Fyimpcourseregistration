import { redirect } from 'next/navigation'
import { verifyStudent } from '@/core/auth/verifyRole'
import { getSupabaseServerClient } from '@/core/database/supabaseClient'
import StudentDashboardClient from './StudentDashboardClient'

export const dynamic = 'force-dynamic'

export default async function StudentDashboardPage() {
  const auth = await verifyStudent({ allowMustChangePassword: true })
  if (!auth.success) {
    redirect('/login')
  }

  const supabase = await getSupabaseServerClient()

  // 1. Get student profile details
  const { data: student } = await supabase
    .from('students')
    .select(`
      full_name,
      roll_number,
      current_semester,
      academic_year_joined,
      must_change_password,
      departments (name),
      campuses (name)
    `)
    .eq('id', auth.userId)
    .single()

  if (!student) {
    redirect('/login')
  }

  if (student.must_change_password) {
    redirect('/dashboard/student/change-password')
  }

  // 2. Check if student has already submitted this semester
  const { data: reg } = await supabase
    .from('student_registrations')
    .select('student_id')
    .eq('student_id', auth.userId)
    .eq('semester', student.current_semester)
    .maybeSingle()

  const studentInfo = {
    full_name: student.full_name,
    roll_number: student.roll_number,
    current_semester: student.current_semester,
    academic_year_joined: student.academic_year_joined ?? '—',
    department_name: (student.departments as any)?.name ?? 'Unknown',
    campus_name: (student.campuses as any)?.name ?? 'Unknown',
  }

  return (
    <StudentDashboardClient
      studentInfo={studentInfo}
      hasSubmission={!!reg}
    />
  )
}
