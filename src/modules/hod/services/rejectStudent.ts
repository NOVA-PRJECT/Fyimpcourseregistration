import { supabaseAdmin } from '@/core/database/supabaseAdmin'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function rejectStudent(studentId: string) {

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized', status: 401 }

  // Verify HOD
  const { data: hod } = await supabase
    .from('faculty')
    .select('role, department_id')
    .eq('id', user.id)
    .single()

  if (!hod || hod.role !== 'hod') {
    return { success: false, error: 'Unauthorized', status: 403 }
  }

  // Verify student belongs to HOD's department
  const { data: student } = await supabaseAdmin
    .from('students')
    .select('id, department_id')
    .eq('id', studentId)
    .single()

  if (!student || student.department_id !== hod.department_id) {
    return { success: false, error: 'Student not found', status: 404 }
  }

  // Delete student record
  const { error: deleteError } = await supabaseAdmin
    .from('students')
    .delete()
    .eq('id', studentId)

  if (deleteError) {
    return { success: false, error: 'Failed to delete student record', status: 500 }
  }

  // Delete auth account
  await supabaseAdmin.auth.admin.deleteUser(studentId)

  return { success: true, message: 'Student rejected and removed successfully' }
}