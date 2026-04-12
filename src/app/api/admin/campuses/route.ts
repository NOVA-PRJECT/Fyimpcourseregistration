import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/core/database/supabaseAdmin'
import { verifySuperAdmin } from '@/core/auth/verifyRole'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const CampusSchema = z.object({
  name: z.string().min(1, 'Campus name is required'),
  code: z.string().min(1, 'Campus code is required'),
})

// GET — list all campuses
export async function GET() {
  const auth = await verifySuperAdmin()
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { data, error } = await supabaseAdmin
    .from('campuses')
    .select('*')
    .order('name')

  if (error) {
    console.error('admin/campuses GET failed:', error)
    return NextResponse.json({ error: 'Failed to fetch campuses' }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

// POST — add campus
export async function POST(request: NextRequest) {
  const auth = await verifySuperAdmin()
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

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
    console.error('admin/campuses POST failed:', error)
    return NextResponse.json({ error: 'Failed to add campus' }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'Campus added successfully' })
}

// PUT — edit campus
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
    .from('campuses')
    .update({ name, code: code.toUpperCase() })
    .eq('id', id)

  if (error) {
    console.error('admin/campuses PUT failed:', error)
    return NextResponse.json({ error: 'Failed to update campus' }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'Campus updated successfully' })
}

// DELETE — delete campus and all data under it
export async function DELETE(request: NextRequest) {
  const cookieStore = await cookies()
  const user = await verifyAdmin(cookieStore)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
  for (const s of students ?? []) {
    await supabaseAdmin.auth.admin.deleteUser(s.id)
  }
  for (const f of faculty ?? []) {
    await supabaseAdmin.auth.admin.deleteUser(f.id)
  }

  return NextResponse.json({ success: true, message: 'Campus deleted successfully' })
}