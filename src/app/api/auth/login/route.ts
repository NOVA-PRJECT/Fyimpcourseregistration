import { NextRequest, NextResponse } from 'next/server'
import { determineUserRoute } from '@/modules/auth/services/routeUser'
import { loginLimiter, emailLoginLimiter, resetLoginRateLimits } from '@/core/security/rateLimiter'
import { supabaseAdmin } from '@/core/database/supabaseAdmin'
import { createResponseTrackingClient } from '@/core/database/supabaseClient'
import { LoginSchema } from '@/modules/auth/schemas/loginSchema'
import { logAuditEvent, AuditEvents } from '@/core/logging/auditLogger'

export async function POST(request: NextRequest) {
  let ip = request.headers.get('x-forwarded-for') ?? 'unknown'
  if (ip && ip !== 'unknown') {
    ip = ip.split(',')[0].trim()
  }

  // Parse and validate body first so we have the email for the email limiter
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

  // Run both rate limiters in parallel now that we have ip and email
  const [ipLimit, emailLimit] = await Promise.all([
    loginLimiter.limit(ip),
    emailLoginLimiter.limit(email.toLowerCase()),
  ])

  if (!ipLimit.success) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429 }
    )
  }

  if (!emailLimit.success) {
    return NextResponse.json(
      { error: 'Too many attempts for this account. Please try again later.' },
      { status: 429 }
    )
  }

  const { client: supabase, cookiesToSetAtEnd } = await createResponseTrackingClient()

  // 4. Perform signInWithPassword
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (authError || !authData?.user) {
    // Fire and forget — don't block the error response
    logAuditEvent({
      eventType: 'login_failed',
      userId: 'unknown',
      userRole: 'unknown',
      action: `failed login attempt`,
      resourceType: 'user',
      status: 'failure',
      ipAddress: ip,
      metadata: { email },
    })
    return NextResponse.json(
      { error: 'Invalid email or password. Please try again.' },
      { status: 401 }
    )
  }

  // Reset rate limits on successful login
  try {
    await resetLoginRateLimits(ip, email.toLowerCase())
  } catch (resetError) {
    console.error('Failed to reset login rate limits:', resetError)
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

  // Do not await — audit log must not block the login response
  logAuditEvent({
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
