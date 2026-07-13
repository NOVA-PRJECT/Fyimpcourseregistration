import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/core/database/supabaseClient'
import { verifyHod, handleAuthError } from '@/core/auth/verifyRole'
import { logServerError } from '@/core/logging/logger'
import { BlueprintUpdateSchema } from '@/modules/hod/schemas/blueprintSchema'
import { adminCrudLimiter } from '@/core/security/rateLimiter'
import { logAuditEvent, AuditEvents } from '@/core/logging/auditLogger'

export const dynamic = 'force-dynamic'

// GET — fetch blueprint for dept + semester
export async function GET(request: NextRequest) {
  const auth = await verifyHod()
  if (!auth.success) return handleAuthError(auth)

  const { searchParams } = new URL(request.url)
  const semester = searchParams.get('semester')
  if (!semester) {
    return NextResponse.json({ error: 'Semester required' }, { status: 400 })
  }

  const supabase = await getSupabaseServerClient()
  const { data, error } = await supabase
    .from('semester_blueprints')
    .select('*')
    .eq('department_id', auth.department_id)
    .eq('semester', Number(semester))
    .single()

  if (error && error.code !== 'PGRST116') {
    logServerError('/api/hod/blueprint', error, { userId: auth.userId, method: 'GET', semester })
    return NextResponse.json({ error: 'Failed to fetch blueprint' }, { status: 500 })
  }

  return NextResponse.json(data ?? null)
}

// PUT — save blueprint changes (upsert)
export async function PUT(request: NextRequest) {
  const auth = await verifyHod()
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

  const result = BlueprintUpdateSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    )
  }

  const { semester, min_credits, max_credits, slots } = result.data

  const payload: Record<string, any> = {
    department_id: auth.department_id,
    semester,
    min_credits,
    max_credits,
  }

  for (let i = 1; i <= 6; i++) {
    const slot = slots.find((s: any) => s.slot === i)
    payload[`slot_${i}_rule`] = slot?.rule || null
    payload[`slot_${i}_target`] = slot?.target || null
    payload[`slot_${i}_name`] = slot?.name || null
  }

  const supabase = await getSupabaseServerClient()
  const { error } = await supabase
    .from('semester_blueprints')
    .upsert(payload, { onConflict: 'department_id,semester' })

  if (error) {
    logServerError('/api/hod/blueprint', error, { userId: auth.userId, method: 'PUT', semester })
    return NextResponse.json({ error: 'Failed to save blueprint' }, { status: 500 })
  }

  await logAuditEvent({
    eventType: AuditEvents.BLUEPRINT_SAVED,
    userId: auth.userId,
    userRole: auth.role,
    action: `saved blueprint for semester ${semester}`,
    resourceType: 'blueprint',
    status: 'success',
    metadata: {
      semester,
      min_credits,
      max_credits,
      department_id: auth.department_id,
    }
  })

  return NextResponse.json({ success: true, message: 'Blueprint saved successfully' })
}
