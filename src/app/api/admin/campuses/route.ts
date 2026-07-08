import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/core/database/supabaseAdmin'
import { verifySuperAdmin, handleAuthError } from '@/core/auth/verifyRole'
import { deleteAuthUser } from '@/core/auth/deleteAuthUser'
import { logServerError } from '@/core/logging/logger'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const CampusSchema = z.object({
  name: z.string().min(1, 'Campus name is required'),
  code: z.string().min(1, 'Campus code is required'),
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

  const body = await request.json()
  const result = CampusSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('campuses')
    .insert({ name: result.data.name, code: result.data.code.toUpperCase() })

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Campus name or code already exists' }, { status: 409 })
    }
    logServerError('/api/admin/campuses', error, { userId: auth.userId, method: 'POST', body: result.data })
    return NextResponse.json({ error: 'Failed to add campus' }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'Campus added successfully' })
}

// PUT — edit campus
export async function PUT(request: NextRequest) {
  const auth = await verifySuperAdmin()
  if (!auth.success) return handleAuthError(auth)

  const { id, name, code } = await request.json()
  if (!id || !name || !code) {
    return NextResponse.json({ error: 'ID, name and code are required' }, { status: 400 })
  }

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

  const { campus_id } = await request.json()
  if (!campus_id) return NextResponse.json({ error: 'Campus ID required' }, { status: 400 })

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