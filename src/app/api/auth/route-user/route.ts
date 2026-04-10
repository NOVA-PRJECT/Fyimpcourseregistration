import { NextRequest, NextResponse } from 'next/server'
import { determineUserRoute } from '@/modules/auth/services/routeUser'
import { Role } from '@/core/constants/roles'
import { checkRateLimit } from '@/core/security/rateLimiter'

export async function POST(request: NextRequest) {

  const { auth_user_id } = await request.json()

  if (!auth_user_id) {
    return NextResponse.json(
      { error: 'No user ID provided' },
      { status: 400 }
    )
  }

  // Rate Limiting (prevent brute force logins from the same IP)
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown-ip'
  const isAllowed = checkRateLimit(`login:${ip}`, 5, 2 * 60 * 1000) // 5 attempts per 2 mins

  if (!isAllowed) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again later.' },
      { status: 429 }
    )
  }

  const { role, redirectTo } = await determineUserRoute(auth_user_id)

  if (!role || !redirectTo) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 403 }
    )
  }

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