import { NextRequest, NextResponse } from 'next/server'
import { verifyDirector, handleAuthError } from '@/core/auth/verifyRole'
import { supabaseAdmin } from '@/core/database/supabaseAdmin'
import { CampusSettingsSchema } from '@/modules/admin/schemas/campusSettingsSchema'
import { updateSettings } from '@/modules/admin/services/updateSettings'
import { adminCrudLimiter } from '@/core/security/rateLimiter'
import { logAuditEvent, AuditEvents } from '@/core/logging/auditLogger'

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

export async function PUT(request: NextRequest) {
  const auth = await verifyDirector()
  if (!auth.success) return handleAuthError(auth)

  const { success: withinLimit } = await adminCrudLimiter.limit(auth.userId)
  if (!withinLimit) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const result = CampusSettingsSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
  }

  const response = await updateSettings(auth, result.data)
  if (!response.success) {
    return NextResponse.json({ error: response.error }, { status: response.status })
  }

  await logAuditEvent({
    eventType: AuditEvents.SETTINGS_MODIFIED,
    userId: auth.userId,
    userRole: auth.role,
    action: 'modified campus settings',
    resourceType: 'campus_settings',
    resourceId: auth.campus_id,
    status: 'success',
    metadata: {
      deadline: result.data.deadline,
      min_credits: result.data.min_credits,
      max_credits: result.data.max_credits,
    }
  })

  return NextResponse.json({ success: true, message: response.message })
}
