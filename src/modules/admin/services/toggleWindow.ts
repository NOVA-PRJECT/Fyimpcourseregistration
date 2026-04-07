import { supabaseAdmin } from '@/core/database/supabaseAdmin'
import { CampusSettingsInput } from '@/modules/admin/schemas/campusSettingsSchema'

// Helper: Calculate current academic year
function getCurrentAcademicYear(): string {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  // Academic year starts in June
  return month >= 6
    ? `${year}-${String(year + 1).slice(2)}`
    : `${year - 1}-${String(year).slice(2)}`
}

// campus_id is passed in from the route handler after auth is verified there.
// This service no longer does any auth of its own.
export async function toggleWindow(
  {
    status,
    deadline,
    min_credits = 18,
    max_credits = 26,
  }: CampusSettingsInput,
  campus_id: string
) {
  try {
    // Validate deadline
    const deadlineDate = new Date(deadline)

    if (isNaN(deadlineDate.getTime())) {
      return { success: false, error: 'Invalid deadline date', status: 400 }
    }

    if (status === 'OPEN' && deadlineDate < new Date()) {
      return {
        success: false,
        error: 'Deadline cannot be in the past',
        status: 400,
      }
    }

    const currentAcademicYear = getCurrentAcademicYear()

    const { error: upsertError } = await supabaseAdmin
      .from('campus_settings')
      .upsert(
        {
          campus_id,
          registration_is_open: status === 'OPEN',
          deadline: deadlineDate.toISOString(),
          min_credits,
          max_credits,
          academic_year: currentAcademicYear,
        },
        { onConflict: 'campus_id' }
      )

    if (upsertError) {
      return {
        success: false,
        error: 'Failed to update registration window',
        status: 500,
      }
    }

    return {
      success: true,
      message: `Registration window ${status === 'OPEN' ? 'opened' : 'closed'} successfully`,
    }
  } catch (err) {
    console.error('Toggle window error:', err)
    return { success: false, error: 'Internal server error', status: 500 }
  }
}
