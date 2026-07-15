import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { PasswordValidationSchema } from '@/core/validation/passwordSchema'
import { supabaseAdmin } from '@/core/database/supabaseAdmin'
import { verifyStudent, handleAuthError } from '@/core/auth/verifyRole'
import { logServerError } from '@/core/logging/logger'
import { changePasswordLimiter } from '@/core/security/rateLimiter'
import { createResponseTrackingClient } from '@/core/database/supabaseClient'
import { logAuditEvent, AuditEvents } from '@/core/logging/auditLogger'


export const dynamic = 'force-dynamic'

const ChangePasswordSchema = z.object({
  new_password: PasswordValidationSchema,
  confirm_password: z.string().min(1, 'Please confirm your password'),
}).refine(data => data.new_password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})

export async function POST(request: NextRequest) {
  const auth = await verifyStudent({ allowMustChangePassword: true })
  if (!auth.success) return handleAuthError(auth)

  // Rate limit by student user ID
  const { success: withinLimit } = await changePasswordLimiter.limit(auth.userId)
  if (!withinLimit) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429 }
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const result = ChangePasswordSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    )
  }

  // 1. Update password & app_metadata via admin API
  const { error: pwError } = await supabaseAdmin.auth.admin.updateUserById(
    auth.userId,
    {
      password: result.data.new_password,
      app_metadata: {
        role: 'student',
        department_id: auth.department_id,
        campus_id: auth.campus_id,
        must_change_password: false,
      }
    }
  )

  if (pwError) {
    logServerError('/api/student/change-password', pwError, { userId: auth.userId, step: 'auth_update' })
    return NextResponse.json({ error: 'Failed to update password' }, { status: 500 })
  }

  // 2. Clear the must_change_password flag in DB
  const { error: flagError } = await supabaseAdmin
    .from('students')
    .update({ must_change_password: false })
    .eq('id', auth.userId)

  if (flagError) {
    logServerError('/api/student/change-password', flagError, { userId: auth.userId, step: 'flag_update' })
    return NextResponse.json({ error: 'Failed to update user flags' }, { status: 500 })
  }

  // 3. Re-authenticate with the new password to establish a fresh valid session.
  // updateUserById() revokes the existing refresh token as a side effect —
  // refreshSession() on the now-dead session always fails, clearing cookies instead
  // of renewing them. signInWithPassword with the new password creates a genuine
  // new session and correctly writes fresh cookies.
  const { data: userData, error: userLookupError } = await supabaseAdmin.auth.admin.getUserById(auth.userId)

  if (userLookupError || !userData.user?.email) {
    logServerError('/api/student/change-password', userLookupError, {
      userId: auth.userId,
      step: 'user_lookup',
    })
    return NextResponse.json(
      { error: 'Password updated but re-login failed. Please sign in again with your new password.' },
      { status: 500 }
    )
  }

  const { client: supabase, cookiesToSetAtEnd } = await createResponseTrackingClient()

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: userData.user.email,
    password: result.data.new_password,
  })

  if (signInError) {
    logServerError('/api/student/change-password', signInError, {
      userId: auth.userId,
      step: 'reauth',
    })
    return NextResponse.json(
      { error: 'Password updated but re-login failed. Please sign in again with your new password.' },
      { status: 500 }
    )
  }

  const response = NextResponse.json({ success: true, message: 'Password changed successfully' })

  // Forward the new session cookies to the response
  cookiesToSetAtEnd.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options)
  })

  await logAuditEvent({
    eventType: AuditEvents.PASSWORD_CHANGED,
    userId: auth.userId,
    userRole: auth.role,
    action: 'changed password',
    resourceType: 'user',
    resourceId: auth.userId,
    status: 'success',
  })

  return response
}
