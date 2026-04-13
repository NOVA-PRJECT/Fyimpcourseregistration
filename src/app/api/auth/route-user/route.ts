import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { determineUserRoute } from '@/modules/auth/services/routeUser'
import { Role } from '@/core/constants/roles'
import { loginLimiter } from '@/core/security/rateLimiter'
import { supabaseAdmin } from '@/core/database/supabaseAdmin'

export async function POST(request: NextRequest) {

  // Rate Limiting (prevent brute force logins from the same IP)
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
  const { success } = await loginLimiter.limit(ip)

  if (!success) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429 }
    )
  }

  // Parse request body
  const { auth_user_id } = await request.json()

  // 1. Initialize Supabase client to check session
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) =>
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          ),
      },
    }
  )

  // 2. Verify Session
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 3. Security Check: Block if trying to spoof another user ID
  if (user.id !== auth_user_id) {
    return NextResponse.json(
      { error: 'Security violation: User ID mismatch' },
      { status: 403 }
    )
  }

  const { role, redirectTo } = await determineUserRoute(auth_user_id)

  if (!role || !redirectTo) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 403 }
    )
  }

  // 4. Sync role to Supabase Auth metadata for secure middleware checks
  await supabaseAdmin.auth.admin.updateUserById(auth_user_id, {
    user_metadata: { role }, // for client-side easy access
    app_metadata: { role }   // for secure server-side middleware access
  })

  const response = NextResponse.json({ redirectTo })

  response.cookies.set('user_role', role, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7
  })

  return response
}