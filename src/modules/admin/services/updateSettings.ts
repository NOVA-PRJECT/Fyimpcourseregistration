import { CampusSettingsInput } from '@/modules/admin/schemas/campusSettingsSchema'
import { getSupabaseServerClient } from '@/core/database/supabaseClient'
import { VerifiedDirector } from '@/core/auth/verifyRole'

function getCurrentAcademicYear(): string {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  if (month >= 6) return `${year}-${String(year + 1).slice(2)}`
  return `${year - 1}-${String(year).slice(2)}`
}

export async function updateSettings(
  auth: VerifiedDirector,
  {
    deadline,
  }: CampusSettingsInput
) {
  const supabase = await getSupabaseServerClient()

  const deadlineDate = new Date(deadline)
  if (isNaN(deadlineDate.getTime())) {
    return { success: false, error: 'Invalid deadline date', status: 400 }
  }

  const academic_year = getCurrentAcademicYear()

  const { error } = await supabase
    .from('campus_settings')
    .upsert({
      campus_id: auth.campus_id,
      deadline: deadlineDate.toISOString(),
      academic_year,
    }, { onConflict: 'campus_id' })

  if (error) return { success: false, error: 'Failed to save settings', status: 500 }

  return { success: true, message: 'Settings saved successfully' }
}