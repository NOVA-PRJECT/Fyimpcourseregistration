import { NextResponse } from 'next/server'
import { createResponseTrackingClient } from '@/core/database/supabaseClient'
import { logAuditEvent, AuditEvents } from '@/core/logging/auditLogger'

export const dynamic = 'force-dynamic'

export async function POST() {
  const { client: supabase, cookiesToSetAtEnd } = await createResponseTrackingClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Get user role from claims before logging out
  const { data: claimsData } = await supabase.auth.getClaims()
  const userRole = claimsData?.claims?.app_metadata?.role || 'unknown'

  await supabase.auth.signOut()

  // Log audit event
  await logAuditEvent({
    eventType: AuditEvents.USER_LOGOUT,
    userId: user.id,
    userRole: userRole,
    action: 'user logged out',
    resourceType: 'user',
    resourceId: user.id,
    status: 'success',
  })

  const response = NextResponse.json({ success: true })

  // Let the cookie-tracking client write the cleared cookies —
  // do NOT hardcode cookie names since the sb-* name is dynamic
  cookiesToSetAtEnd.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options)
  })

  // Clear user_role cookie
  response.cookies.set('user_role', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })

  return response
}
