import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/core/database/supabaseAdmin'
import { verifySuperAdmin } from '@/core/auth/verifyRole'
import { AddFacultySchema } from '@/modules/admin/schemas/addFacultySchema'
import { createFacultyUser } from '@/modules/admin/services/createFacultyUser'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// GET — list all faculty
export async function GET() {
  const auth = await verifySuperAdmin()
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { data, error } = await supabaseAdmin
    .from('faculty')
    .select(`
      id, full_name, email, role,
      departments (name),
      campuses (name)
    `)
    .order('role')

  if (error) {
    console.error('admin/faculty-list GET failed:', error)
    return NextResponse.json({ error: 'Failed to fetch faculty' }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

// POST — create faculty (superadmin picks campus)
const SuperAdminAddFacultySchema = AddFacultySchema.extend({
  campus_id: z.string().uuid('Invalid campus ID'),
})

export async function POST(request: NextRequest) {
  const auth = await verifySuperAdmin()
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const body = await request.json()
  const result = SuperAdminAddFacultySchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: result.error.flatten() },
      { status: 400 }
    )
  }

  const response = await createFacultyUser(result.data)

  if (!response.success) {
    return NextResponse.json({ error: response.error }, { status: response.status })
  }

  return NextResponse.json({ success: true, message: response.message })
}

// PUT — update faculty name, role, department
const UpdateFacultySchema = z.object({
  id: z.string().uuid('Invalid faculty ID'),
  full_name: z.string().min(1, 'Name is required').optional(),
  role: z.enum(['hod', 'campus_director', 'teaching_staff']).optional(),
  department_id: z.string().uuid().nullable().optional(),
})

export async function PUT(request: NextRequest) {
  const auth = await verifySuperAdmin()
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const body = await request.json()
  const result = UpdateFacultySchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: result.error.flatten() },
      { status: 400 }
    )
  }

  const { id, ...updates } = result.data

  // If switching to campus_director or teaching_staff, clear department
  if (updates.role === 'campus_director' || updates.role === 'teaching_staff') {
    updates.department_id = null
  }

  // If switching to hod, department must be provided
  if (updates.role === 'hod' && updates.department_id === undefined) {
    return NextResponse.json(
      { error: 'HOD must be assigned to a department' },
      { status: 400 }
    )
  }

  const { error } = await supabaseAdmin
    .from('faculty')
    .update(updates)
    .eq('id', id)

  if (error) {
    console.error('admin/faculty-list PUT failed:', error)
    return NextResponse.json({ error: 'Failed to update faculty' }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'Faculty updated successfully' })
}

// DELETE — delete faculty account
export async function DELETE(request: NextRequest) {
  const auth = await verifySuperAdmin()
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { faculty_id } = await request.json()
  if (!faculty_id) {
    return NextResponse.json({ error: 'Faculty ID required' }, { status: 400 })
  }

  await supabaseAdmin.from('faculty').delete().eq('id', faculty_id)
  await supabaseAdmin.auth.admin.deleteUser(faculty_id)

  return NextResponse.json({ success: true, message: 'Faculty removed successfully' })
}
