import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/core/database/supabaseAdmin'

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