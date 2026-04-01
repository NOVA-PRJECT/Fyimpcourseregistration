import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function checkApprovalStatus() {

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

  if (!user) {
    return { success: false, error: 'Unauthorized', status: 401 }
  }

  const { data: student, error } = await supabase
    .from('students')
    .select('account_status, full_name')
    .eq('id', user.id)
    .single()

  if (error || !student) {
    return { success: false, error: 'Student not found', status: 404 }
  }

  return {
    success: true,
    data: {
      account_status: student.account_status,
      full_name: student.full_name,
    }
  }
}