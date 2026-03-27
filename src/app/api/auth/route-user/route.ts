import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/core/database/supabaseAdmin'
import { ROLE_DASHBOARD_MAP } from '@/core/security/routeConfig'
import { Role } from '@/core/constants/roles'

export async function POST(request: NextRequest) {

  const { auth_user_id } = await request.json()

  if (!auth_user_id) {
    return NextResponse.json(
      { error: 'No user ID provided' },
      { status: 400 }
    )
  }

  let role: Role | null = null

  // Check students table
  const { data: student } = await supabaseAdmin
    .from('students')
    .select('id')
    .eq('id', auth_user_id)
    .single()

  if (student) {
    role = 'student'
  }

  // Check faculty table
  if (!role) {
    const { data: faculty } = await supabaseAdmin
      .from('faculty')
      .select('id, role')
      .eq('id', auth_user_id)
      .single()

    if (faculty) {
      role = faculty.role as Role
    }
  }

  // Check admins table
  if (!role) {
    const { data: admin } = await supabaseAdmin
      .from('admins')
      .select('id')
      .eq('id', auth_user_id)
      .single()

    if (admin) {
      role = 'superadmin'
    }
  }

  // Nobody found — reject
  if (!role) {
    return NextResponse.json(
      { error: 'User not found in any table' },
      { status: 403 }
    )
  }

  const redirectTo = ROLE_DASHBOARD_MAP[role]

  // Build response with role cookie
  const response = NextResponse.json({ redirectTo })

  response.cookies.set('user_role', role, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7  // 7 days
  })

  return response
}