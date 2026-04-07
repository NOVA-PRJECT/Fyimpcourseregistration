import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/core/database/supabaseAdmin'
import { verifySuperAdmin } from '@/core/auth/verifyRole'
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
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { data, error } = await supabaseAdmin
    .from('departments')
    .select('id, name, code, campus_id, campuses (name)')
    .order('name')

  if (error) {
    console.error('admin/departments GET failed:', error)
    return NextResponse.json({ error: 'Failed to fetch departments' }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

// POST — add department
export async function POST(request: NextRequest) {
  const auth = await verifySuperAdmin()
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

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
    console.error('admin/departments POST failed:', error)
    return NextResponse.json({ error: 'Failed to add department' }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'Department added successfully' })
}

// PUT — edit department
export async function PUT(request: NextRequest) {
  const auth = await verifySuperAdmin()
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { id, name, code } = await request.json()
  if (!id || !name || !code) {
    return NextResponse.json({ error: 'ID, name and code are required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('departments')
    .update({ name, code: code.toUpperCase() })
    .eq('id', id)

  if (error) {
    console.error('admin/departments PUT failed:', error)
    return NextResponse.json({ error: 'Failed to update department' }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'Department updated successfully' })
}

// DELETE — delete department and everything under it
export async function DELETE(request: NextRequest) {
  const auth = await verifySuperAdmin()
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { department_id } = await request.json()
  if (!department_id) {
    return NextResponse.json({ error: 'Department ID required' }, { status: 400 })
  }

  await supabaseAdmin.from('semester_blueprints').delete().eq('department_id', department_id)
  await supabaseAdmin.from('courses').delete().eq('department_id', department_id)

  const { data: students } = await supabaseAdmin
    .from('students')
    .select('id')
    .eq('department_id', department_id)

  for (const student of students ?? []) {
    await supabaseAdmin.from('student_registrations').delete().eq('student_id', student.id)
    await supabaseAdmin.auth.admin.deleteUser(student.id)
  }

  await supabaseAdmin.from('students').delete().eq('department_id', department_id)
  await supabaseAdmin.from('admissions_master').delete().eq('department_id', department_id)

  const { data: faculty } = await supabaseAdmin
    .from('faculty')
    .select('id')
    .eq('department_id', department_id)

  for (const f of faculty ?? []) {
    await supabaseAdmin.auth.admin.deleteUser(f.id)
  }

  await supabaseAdmin.from('faculty').delete().eq('department_id', department_id)

  const { error } = await supabaseAdmin
    .from('departments')
    .delete()
    .eq('id', department_id)

  if (error) {
    console.error('admin/departments DELETE failed:', error)
    return NextResponse.json({ error: 'Failed to delete department' }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'Department deleted successfully' })
}
