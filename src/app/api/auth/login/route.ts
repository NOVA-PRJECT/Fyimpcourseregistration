import { NextRequest, NextResponse } from 'next/server'
import { determineUserRoute } from '@/modules/auth/services/routeUser'
import { loginLimiter } from '@/core/security/rateLimiter'
import { supabaseAdmin } from '@/core/database/supabaseAdmin'
import { createResponseTrackingClient } from '@/core/database/supabaseClient'
import { LoginSchema } from '@/modules/auth/schemas/loginSchema'
import { logAuditEvent, AuditEvents } from '@/core/logging/auditLogger'

export async function POST(request: NextRequest) {
  // 1. Rate Limiting (prevent brute force logins from the same IP)
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
  const { success } = await loginLimiter.limit(ip)

  if (!success) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429 }
    )
  }

  // 2. Parse request body & validate
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const result = LoginSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
  }

  const { email, password } = result.data

  const { client: supabase, cookiesToSetAtEnd } = await createResponseTrackingClient()

  // 4. Perform signInWithPassword
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (authError || !authData?.user) {
    return NextResponse.json(
      { error: 'Invalid email or password. Please try again.' },
      { status: 401 }
    )
  }

  // 5. Look up role & details in database tables
  const { role, redirectTo, department_id, campus_id, must_change_password } = await determineUserRoute(authData.user.id)

  if (!role || !redirectTo) {
    return NextResponse.json(
      { error: 'Account configuration mismatch: user role not found in portal database.' },
      { status: 403 }
    )
  }

  // 6. Sync role and organizational metadata to Supabase Auth user (app_metadata & user_metadata)
  await supabaseAdmin.auth.admin.updateUserById(authData.user.id, {
    user_metadata: { role },
    app_metadata: {
      role,
      department_id: department_id ?? null,
      campus_id: campus_id ?? null,
      must_change_password: must_change_password ?? false
    }
  })

  // Refresh session so cookies are rewritten with updated app_metadata immediately
  if (authData.session) {
    await supabase.auth.refreshSession(authData.session)
  }

  // 7. Formulate redirect response and set user_role cookie
  const response = NextResponse.json({ redirectTo })

  // Forward session cookies to client response
  cookiesToSetAtEnd.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options)
  })

  response.cookies.set('user_role', role, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7
  })

  await logAuditEvent({
    eventType: AuditEvents.USER_LOGIN,
    userId: authData.user.id,
    userRole: role,
    action: 'user logged in',
    resourceType: 'user',
    resourceId: authData.user.id,
    status: 'success',
    ipAddress: ip,
  })

  return response
}
