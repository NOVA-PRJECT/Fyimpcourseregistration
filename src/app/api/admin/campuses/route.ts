import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/core/database/supabaseAdmin'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const CampusSchema = z.object({
  name: z.string().min(1, 'Campus name is required'),
  code: z.string().min(1, 'Campus code is required'),
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

// GET — list all campuses
export async function GET() {
  const cookieStore = await cookies()
  const user = await verifyAdmin(cookieStore)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('campuses')
    .select('*')
    .order('name')

  if (error) return NextResponse.json({ error: 'Failed to fetch campuses' }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST — add campus
export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const user = await verifyAdmin(cookieStore)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
    return NextResponse.json({ error: 'Failed to add campus' }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'Campus added successfully' })
}

// PUT — edit campus
export async function PUT(request: NextRequest) {
  const cookieStore = await cookies()
  const user = await verifyAdmin(cookieStore)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { id, name, code } = body

  if (!id || !name || !code) {
    return NextResponse.json({ error: 'ID, name and code are required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('campuses')
    .update({ name, code: code.toUpperCase() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: 'Failed to update campus' }, { status: 500 })
  return NextResponse.json({ success: true, message: 'Campus updated successfully' })
}

// DELETE — delete campus + everything under it
export async function DELETE(request: NextRequest) {
  const cookieStore = await cookies()
  const user = await verifyAdmin(cookieStore)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { campus_id } = await request.json()
  if (!campus_id) return NextResponse.json({ error: 'Campus ID required' }, { status: 400 })

  // Get all departments under this campus
  const { data: departments } = await supabaseAdmin
    .from('departments')
    .select('id')
    .eq('campus_id', campus_id)

  const deptIds = departments?.map(d => d.id) ?? []

  // Delete student registrations for students in this campus
  await supabaseAdmin
    .from('student_registrations')
    .delete()
    .eq('campus_id', campus_id)

  // Get all students in this campus
  const { data: students } = await supabaseAdmin
    .from('students')
    .select('id')
    .eq('campus_id', campus_id)

  // Delete student auth accounts
  for (const student of students ?? []) {
    await supabaseAdmin.auth.admin.deleteUser(student.id)
  }

  // Delete students
  await supabaseAdmin
    .from('students')
    .delete()
    .eq('campus_id', campus_id)

  // Delete admissions_master for this campus
  await supabaseAdmin
    .from('admissions_master')
    .delete()
    .eq('campus_id', campus_id)

  // Delete semester blueprints for departments in this campus
  if (deptIds.length > 0) {
    await supabaseAdmin
      .from('semester_blueprints')
      .delete()
      .in('department_id', deptIds)

    await supabaseAdmin
      .from('courses')
      .delete()
      .in('department_id', deptIds)
  }

  // Get faculty in this campus
  const { data: faculty } = await supabaseAdmin
    .from('faculty')
    .select('id')
    .eq('campus_id', campus_id)

  // Delete faculty auth accounts
  for (const f of faculty ?? []) {
    await supabaseAdmin.auth.admin.deleteUser(f.id)
  }

  // Delete faculty
  await supabaseAdmin
    .from('faculty')
    .delete()
    .eq('campus_id', campus_id)

  // Delete campus settings
  await supabaseAdmin
    .from('campus_settings')
    .delete()
    .eq('campus_id', campus_id)

  // Delete departments
  await supabaseAdmin
    .from('departments')
    .delete()
    .eq('campus_id', campus_id)

  // Finally delete campus
  const { error } = await supabaseAdmin
    .from('campuses')
    .delete()
    .eq('id', campus_id)

  if (error) return NextResponse.json({ error: 'Failed to delete campus' }, { status: 500 })
  return NextResponse.json({ success: true, message: 'Campus and all data deleted successfully' })
}