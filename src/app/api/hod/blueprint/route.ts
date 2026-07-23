import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/core/database/supabaseClient'
import { verifyHod, handleAuthError } from '@/core/auth/verifyRole'
import { logServerError } from '@/core/logging/logger'
import { BlueprintUpdateSchema } from '@/modules/hod/schemas/blueprintSchema'
import { adminCrudLimiter } from '@/core/security/rateLimiter'
import { logAuditEvent, AuditEvents } from '@/core/logging/auditLogger'

export const dynamic = 'force-dynamic'

/**
 * Generate a URL-safe slug from a pathway name + random suffix.
 * e.g. "Research Track" → "research-track-x7k2"
 */
function generatePathwayId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  const suffix = Math.random().toString(36).slice(2, 6)
  return `${slug}-${suffix}`
}

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

  const { semester, min_credits, max_credits, pathways } = result.data

  // Assign IDs to pathways: preserve existing IDs, generate new ones for new pathways
  const pathwaysWithIds = pathways.map(p => ({
    ...p,
    id: p.id && p.id.trim() !== '' ? p.id : generatePathwayId(p.name),
  }))

  const payload: Record<string, unknown> = {
    department_id: auth.department_id,
    semester,
    min_credits,
    max_credits,
    pathways: pathwaysWithIds,
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
      pathway_count: pathwaysWithIds.length,
    }
  })

  return NextResponse.json({ success: true, message: 'Blueprint saved successfully' })
}
