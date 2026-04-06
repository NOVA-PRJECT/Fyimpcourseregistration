import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/core/database/supabaseAdmin'
import { AddFacultySchema } from '@/modules/admin/schemas/addFacultySchema'
import { createFacultyUser } from '@/modules/admin/services/createFacultyUser'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

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
    .from('admins').select('role').eq('id', user.id).single()
  if (!admin || admin.role !== 'superadmin') return null
  return user
}

// GET — list all faculty
export async function GET() {
  const cookieStore = await cookies()
  const user = await verifyAdmin(cookieStore)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('faculty')
    .select(`
      id, full_name, email, role,
      departments (name),
      campuses (name)
    `)
    .order('role')

  if (error) return NextResponse.json({ error: 'Failed to fetch faculty' }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST — create faculty (superadmin picks campus)
const SuperAdminAddFacultySchema = AddFacultySchema.extend({
  campus_id: z.string().uuid('Invalid campus ID'),
})

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const user = await verifyAdmin(cookieStore)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
    return NextResponse.json(
      { error: response.error },
      { status: response.status }
    )
  }

  return NextResponse.json({ success: true, message: response.message })
}

// PUT — update faculty name, role, department
const UpdateFacultySchema = z.object({
  id: z.string().uuid('Invalid faculty ID'),
  full_name: z.string().min(1, 'Name is required').optional(),
  role: z.enum(['hod', 'campus_director']).optional(),
  department_id: z.string().uuid().nullable().optional(),
})

export async function PUT(request: NextRequest) {
  const cookieStore = await cookies()
  const user = await verifyAdmin(cookieStore)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const result = UpdateFacultySchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: result.error.flatten() },
      { status: 400 }
    )
  }

  const { id, ...updates } = result.data

  // If switching to campus_director, clear department
  if (updates.role === 'campus_director') {
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

  if (error) return NextResponse.json({ error: 'Failed to update faculty' }, { status: 500 })

  return NextResponse.json({ success: true, message: 'Faculty updated successfully' })
}

// DELETE — delete faculty account
export async function DELETE(request: NextRequest) {
  const cookieStore = await cookies()
  const user = await verifyAdmin(cookieStore)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { faculty_id } = await request.json()
  if (!faculty_id) return NextResponse.json({ error: 'Faculty ID required' }, { status: 400 })

  await supabaseAdmin.from('faculty').delete().eq('id', faculty_id)
  await supabaseAdmin.auth.admin.deleteUser(faculty_id)

  return NextResponse.json({ success: true, message: 'Faculty removed successfully' })
}