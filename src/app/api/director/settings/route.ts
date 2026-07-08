import { NextResponse } from 'next/server'
import { verifyDirector, handleAuthError } from '@/core/auth/verifyRole'
import { supabaseAdmin } from '@/core/database/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await verifyDirector()
  if (!auth.success) return handleAuthError(auth)

  // 1. Get faculty (director) full name
  const { data: faculty, error: facultyError } = await supabaseAdmin
    .from('faculty')
    .select('full_name, campus_id')
    .eq('id', auth.userId)
    .single()

  if (facultyError || !faculty) {
    return NextResponse.json({ error: 'Director profile not found' }, { status: 404 })
  }

  // 2. Get campus name
  const { data: campus } = await supabaseAdmin
    .from('campuses')
    .select('name')
    .eq('id', faculty.campus_id)
    .single()

  // 3. Get campus settings
  const { data: settings } = await supabaseAdmin
    .from('campus_settings')
    .select('deadline, min_credits, max_credits, last_promoted_at')
    .eq('campus_id', faculty.campus_id)
    .single()

  return NextResponse.json({
    directorName: faculty.full_name,
    campusId: faculty.campus_id,
    campusName: campus?.name ?? 'Unknown',
    settings: settings ?? null
  })
}
