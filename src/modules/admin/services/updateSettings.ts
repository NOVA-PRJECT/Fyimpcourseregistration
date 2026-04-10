import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { CampusSettingsInput } from '@/modules/admin/schemas/campusSettingsSchema'

function getCurrentAcademicYear(): string {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  if (month >= 6) return `${year}-${String(year + 1).slice(2)}`
  return `${year - 1}-${String(year).slice(2)}`
}

export async function updateSettings({
  deadline,
  min_credits = 18,
  max_credits = 26,
}: CampusSettingsInput) {

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

  const { data: director } = await supabase
    .from('faculty')
    .select('role, campus_id')
    .eq('id', user.id)
    .single()

  if (!director || director.role !== 'campus_director') {
    return { success: false, error: 'Unauthorized', status: 403 }
  }

  const deadlineDate = new Date(deadline)
  if (isNaN(deadlineDate.getTime())) {
    return { success: false, error: 'Invalid deadline date', status: 400 }
  }

  const academic_year = getCurrentAcademicYear()

  const { error } = await supabase
    .from('campus_settings')
    .upsert({
      campus_id: director.campus_id,
      deadline: deadlineDate.toISOString(),
      min_credits,
      max_credits,
      academic_year,
    }, { onConflict: 'campus_id' })

  if (error) return { success: false, error: 'Failed to save settings', status: 500 }

  return { success: true, message: 'Settings saved successfully' }
}