import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/core/database/supabaseAdmin'
import { verifySuperAdmin, handleAuthError } from '@/core/auth/verifyRole'
import { deleteAuthUser } from '@/core/auth/deleteAuthUser'
import { logServerError } from '@/core/logging/logger'
import { z } from 'zod'
import { adminCrudLimiter } from '@/core/security/rateLimiter'
import { logAuditEvent, AuditEvents } from '@/core/logging/auditLogger'

export const dynamic = 'force-dynamic'

const CampusSchema = z.object({
  name: z.string().min(1, 'Campus name is required'),
  code: z.string().min(1, 'Campus code is required'),
})

const CampusUpdateSchema = z.object({
  id: z.string().uuid('Invalid campus ID'),
  name: z.string().min(1, 'Campus name is required'),
  code: z.string().min(1, 'Campus code is required'),
})

const DeleteCampusSchema = z.object({
  campus_id: z.string().uuid('Invalid campus ID'),
})

// GET — list all campuses
export async function GET() {
  const auth = await verifySuperAdmin()
  if (!auth.success) return handleAuthError(auth)

  const { data, error } = await supabaseAdmin
    .from('campuses')
    .select('*')
    .order('name')

  if (error) {
    logServerError('/api/admin/campuses', error, { userId: auth.userId, method: 'GET' })
    return NextResponse.json({ error: 'Failed to fetch campuses' }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

// POST — add campus
export async function POST(request: NextRequest) {
  const auth = await verifySuperAdmin()
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

  const result = CampusSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
  }

  const { data: createdCampus, error } = await supabaseAdmin
    .from('campuses')
    .insert({ name: result.data.name, code: result.data.code.toUpperCase() })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Campus name or code already exists' }, { status: 409 })
    }
    logServerError('/api/admin/campuses', error, { userId: auth.userId, method: 'POST', body: result.data })
    return NextResponse.json({ error: 'Failed to add campus' }, { status: 500 })
  }

  await logAuditEvent({
    eventType: AuditEvents.CAMPUS_CREATED,
    userId: auth.userId,
    userRole: auth.role,
    action: `created campus: ${result.data.name} (${result.data.code.toUpperCase()})`,
    resourceType: 'campus',
    resourceId: createdCampus?.id,
    status: 'success',
  })

  return NextResponse.json({ success: true, message: 'Campus added successfully' })
}

// PUT — edit campus
export async function PUT(request: NextRequest) {
  const auth = await verifySuperAdmin()
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

  const result = CampusUpdateSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
  }

  const { id, name, code } = result.data

  const { error } = await supabaseAdmin
    .from('campuses')
    .update({ name, code: code.toUpperCase() })
    .eq('id', id)

  if (error) {
    logServerError('/api/admin/campuses', error, { userId: auth.userId, method: 'PUT', body: { id, name, code } })
    return NextResponse.json({ error: 'Failed to update campus' }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'Campus updated successfully' })
}

// DELETE — delete campus and all data under it
export async function DELETE(request: NextRequest) {
  
  const auth = await verifySuperAdmin()
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

  const result = DeleteCampusSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
  }

  const { campus_id } = result.data

  // Get all students and faculty auth IDs before deleting
  const { data: students } = await supabaseAdmin
    .from('students').select('id').eq('campus_id', campus_id)

  const { data: faculty } = await supabaseAdmin
    .from('faculty').select('id').eq('campus_id', campus_id)

  // Delete all database rows atomically via RPC
  const { error } = await supabaseAdmin.rpc('delete_campus_cascade', {
    p_campus_id: campus_id
  })

  if (error) return NextResponse.json({ error: 'Failed to delete campus' }, { status: 500 })

  // Delete auth accounts after DB rows are gone
  // These can't be in the Postgres function
  const allUserIds = [
    ...(students ?? []).map((s) => s.id),
    ...(faculty ?? []).map((f) => f.id),
  ]

  if (allUserIds.length > 0) {
    const results = await Promise.allSettled(
      allUserIds.map((id) => deleteAuthUser(id))
    )

    results.forEach((res, index) => {
      const targetUserId = allUserIds[index]
      if (res.status === 'rejected') {
        logServerError('/api/admin/campuses', res.reason, {
          targetUserId,
          operation: 'delete_auth_user_cascade',
        })
      } else if (res.value?.error) {
        logServerError('/api/admin/campuses', res.value.error, {
          targetUserId,
          operation: 'delete_auth_user_cascade',
        })
      }
    })
  }

  return NextResponse.json({ success: true, message: 'Campus deleted successfully' })
}