import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
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

export async function toggleWindow({
  status,
  deadline,
  min_credits = 18,
  max_credits = 26,
}: CampusSettingsInput) {
  try {
    // Cookies (Next.js server context)
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

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Unauthorized', status: 401 }
    }

    // Fetch faculty
    const { data: director, error: directorError } = await supabase
      .from('faculty')
      .select('role, campus_id')
      .eq('id', user.id)
      .single()

    if (directorError || !director) {
      return { success: false, error: 'Faculty not found', status: 404 }
    }

    // Role check
    if (director.role !== 'campus_director') {
      return { success: false, error: 'Unauthorized', status: 403 }
    }

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

    // Compute academic year
    const currentAcademicYear = getCurrentAcademicYear()

    // Upsert settings
    const { error: upsertError } = await supabase
      .from('campus_settings')
      .upsert(
        {
          campus_id: director.campus_id,
          registration_is_open: status === 'OPEN',
          deadline: deadlineDate.toISOString(),
          min_credits,
          max_credits,
          academic_year: currentAcademicYear,
        },
        {
          onConflict: 'campus_id',
        }
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
      message: `Registration window ${
        status === 'OPEN' ? 'opened' : 'closed'
      } successfully`,
    }
  } catch (err) {
    console.error('Toggle window error:', err)

    return {
      success: false,
      error: 'Internal server error',
      status: 500,
    }
  }
}