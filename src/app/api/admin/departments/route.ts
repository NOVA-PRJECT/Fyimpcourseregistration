import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/core/database/supabaseAdmin'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const DepartmentSchema = z.object({
  name: z.string().min(1, 'Department name is required'),
  code: z.string().min(1, 'Department code is required'),
  campus_id: z.string().uuid('Invalid campus ID'),
})

async function verifyAdmin(cookieStore: any) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet: any) {
          cookiesToSet.forEach(({ name, value, options }: any) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: admin } = await supabase
    .from('admins')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!admin || admin.role !== 'superadmin') return null
  return user
}

// GET — list all departments
export async function GET() {
  const cookieStore = await cookies()
  const user = await verifyAdmin(cookieStore)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('departments')
    .select('id, name, code, campus_id, campuses (name)')
    .order('name')

  if (error) return NextResponse.json({ error: 'Failed to fetch departments' }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST — add department
export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const user = await verifyAdmin(cookieStore)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
    return NextResponse.json({ error: 'Failed to add department' }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'Department added successfully' })
}

// PUT — edit department
export async function PUT(request: NextRequest) {
  const cookieStore = await cookies()
  const user = await verifyAdmin(cookieStore)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, name, code } = await request.json()
  if (!id || !name || !code) {
    return NextResponse.json({ error: 'ID, name and code are required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('departments')
    .update({ name, code: code.toUpperCase() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: 'Failed to update department' }, { status: 500 })
  return NextResponse.json({ success: true, message: 'Department updated successfully' })
}

// DELETE — delete department and everything under it
export async function DELETE(request: NextRequest) {
  const cookieStore = await cookies()
  const user = await verifyAdmin(cookieStore)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { department_id } = await request.json()
  if (!department_id) {
    return NextResponse.json({ error: 'Department ID required' }, { status: 400 })
  }

  // Delete blueprints and courses
  await supabaseAdmin.from('semester_blueprints').delete().eq('department_id', department_id)
  await supabaseAdmin.from('courses').delete().eq('department_id', department_id)

  // Get and delete students
  const { data: students } = await supabaseAdmin
    .from('students').select('id').eq('department_id', department_id)

  for (const student of students ?? []) {
    await supabaseAdmin.from('student_registrations').delete().eq('student_id', student.id)
    await supabaseAdmin.auth.admin.deleteUser(student.id)
  }
  await supabaseAdmin.from('students').delete().eq('department_id', department_id)
  await supabaseAdmin.from('admissions_master').delete().eq('department_id', department_id)

  // Delete HOD faculty
  const { data: faculty } = await supabaseAdmin
    .from('faculty').select('id').eq('department_id', department_id)
  for (const f of faculty ?? []) {
    await supabaseAdmin.auth.admin.deleteUser(f.id)
  }
  await supabaseAdmin.from('faculty').delete().eq('department_id', department_id)

  // Delete department
  const { error } = await supabaseAdmin.from('departments').delete().eq('id', department_id)
  if (error) return NextResponse.json({ error: 'Failed to delete department' }, { status: 500 })
  return NextResponse.json({ success: true, message: 'Department deleted successfully' })
}