import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/core/database/supabaseAdmin'
import { verifySuperAdmin, handleAuthError } from '@/core/auth/verifyRole'
import { deleteAuthUser } from '@/core/auth/deleteAuthUser'
import { logServerError } from '@/core/logging/logger'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const DepartmentSchema = z.object({
  name: z.string().min(1, 'Department name is required'),
  code: z.string().min(1, 'Department code is required'),
  campus_id: z.string().uuid('Invalid campus ID'),
})

// GET — list all departments
export async function GET() {
  const auth = await verifySuperAdmin()
  if (!auth.success) return handleAuthError(auth)

  const { data, error } = await supabaseAdmin
    .from('departments')
    .select('id, name, code, campus_id, campuses (name)')
    .order('name')

  if (error) {
    logServerError('/api/admin/departments', error, { userId: auth.userId, method: 'GET' })
    return NextResponse.json({ error: 'Failed to fetch departments' }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

// POST — add department
export async function POST(request: NextRequest) {
  const auth = await verifySuperAdmin()
  if (!auth.success) return handleAuthError(auth)

  const body = await request.json()
  const result = DepartmentSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('departments')
    .insert({
      name: result.data.name,
      code: result.data.code.toUpperCase(),
      campus_id: result.data.campus_id,
    })

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Department name or code already exists' }, { status: 409 })
    }
    logServerError('/api/admin/departments', error, { userId: auth.userId, method: 'POST', body: result.data })
    return NextResponse.json({ error: 'Failed to add department' }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'Department added successfully' })
}

// PUT — edit department
export async function PUT(request: NextRequest) {
  const auth = await verifySuperAdmin()
  if (!auth.success) return handleAuthError(auth)

  const { id, name, code } = await request.json()
  if (!id || !name || !code) {
    return NextResponse.json({ error: 'ID, name and code are required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('departments')
    .update({ name, code: code.toUpperCase() })
    .eq('id', id)

  if (error) {
    logServerError('/api/admin/departments', error, { userId: auth.userId, method: 'PUT', body: { id, name, code } })
    return NextResponse.json({ error: 'Failed to update department' }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'Department updated successfully' })
}

// DELETE — delete department and everything under it
export async function DELETE(request: NextRequest) {
  const auth = await verifySuperAdmin()
  if (!auth.success) return handleAuthError(auth)

  const { department_id } = await request.json()
  if (!department_id) {
    return NextResponse.json({ error: 'Department ID required' }, { status: 400 })
  }

  // Collect auth IDs before deleting
  const { data: students } = await supabaseAdmin
    .from('students')
    .select('id')
    .eq('department_id', department_id)

  const { data: faculty } = await supabaseAdmin
    .from('faculty')
    .select('id')
    .eq('department_id', department_id)

  // Delete all DB rows atomically via RPC
  const { error } = await supabaseAdmin.rpc('delete_department_cascade', {
    p_department_id: department_id
  })

  if (error) {
    logServerError('/api/admin/departments', error, { userId: auth.userId, method: 'DELETE', departmentId: department_id })
    return NextResponse.json({ error: 'Failed to delete department' }, { status: 500 })
  }

  // Delete auth accounts after DB rows are gone
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
        logServerError('/api/admin/departments', res.reason, {
          targetUserId,
          operation: 'delete_auth_user_cascade',
        })
      } else if (res.value?.error) {
        logServerError('/api/admin/departments', res.value.error, {
          targetUserId,
          operation: 'delete_auth_user_cascade',
        })
      }
    })
  }

  return NextResponse.json({ success: true, message: 'Department deleted successfully' })
}
