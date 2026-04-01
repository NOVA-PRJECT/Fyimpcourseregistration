import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function getPendingStudents() {

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

  const { data: hod, error: hodError } = await supabase
    .from('faculty')
    .select('role, department_id, campus_id')
    .eq('id', user.id)
    .single()

  if (hodError || !hod) {
    return { success: false, error: 'Faculty not found', status: 404 }
  }

  if (hod.role !== 'hod') {
    return { success: false, error: 'Unauthorized', status: 403 }
  }

  const { data: students, error } = await supabase
    .from('students')
    .select('id, full_name, account_status')
    .eq('department_id', hod.department_id)
    .eq('campus_id', hod.campus_id)
    .eq('account_status', 'pending')

  if (error) {
    return { success: false, error: 'Failed to fetch pending students', status: 500 }
  }

  // Get emails from auth
  const studentsWithEmail = await Promise.all(
    (students ?? []).map(async (student) => {
      const { data: authUser } = await supabase.auth.admin
        ? { data: null }
        : { data: null }
      return {
        id: student.id,
        full_name: student.full_name,
      }
    })
  )

  return {
    success: true,
    data: students ?? [],
  }
}