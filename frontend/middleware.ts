import { NextRequest, NextResponse } from 'next/server'
import { DASHBOARD_ROLE_MAP, ROLE_DASHBOARD_MAP } from '@/core/security/routeConfig'
import { Role, ROLES } from '@/core/constants/roles'

type ProfileCheck =
  | { kind: 'authorized'; role: Role }
  | { kind: 'unauthorized' }
  | { kind: 'unavailable' }

async function resolveRoleFromBackend(token: string): Promise<ProfileCheck> {
  const backendUrl = (process.env.BACKEND_URL || 'http://127.0.0.1:4000').replace(/\/$/, '')

  try {
    const response = await fetch(`${backendUrl}/api/auth/profile`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      cache: 'no-store',
    })

    if (response.status === 401 || response.status === 403) {
      return { kind: 'unauthorized' }
    }
    if (!response.ok) {
      return { kind: 'unavailable' }
    }

    const payload = await response.json()
    const validRoles = Object.values(ROLES) as string[]
    if (!validRoles.includes(payload?.role)) {
      return { kind: 'unauthorized' }
    }

    return { kind: 'authorized', role: payload.role as Role }
  } catch {
    return { kind: 'unavailable' }
  }
}

function clearLegacyRoleCookie(response: NextResponse) {
  response.cookies.delete('user_role')
  return response
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isLoginRoute = pathname.startsWith('/login')
  const isDashboardRoute = pathname.startsWith('/dashboard')
  const isConsentRoute = pathname.startsWith('/consent')
  const isHomeRoute = pathname === '/'
  const isApiRoute = pathname.startsWith('/api')

  // API requests are authorized by the NestJS AuthGuard and never by this UI middleware.
  if (isApiRoute) return NextResponse.next()

  const needsRole = isDashboardRoute || isConsentRoute || isLoginRoute || isHomeRoute
  if (!needsRole) return NextResponse.next()

  const token = request.cookies.get('auth_token')?.value
  if (!token) {
    if (isDashboardRoute || isConsentRoute) {
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('auth_token')
      return clearLegacyRoleCookie(response)
    }
    return clearLegacyRoleCookie(NextResponse.next())
  }

  // Never authorize a page from decoded JWT claims or a role cookie. Ask the
  // backend to verify the token and resolve the current role from portal tables.
  const profile = await resolveRoleFromBackend(token)
  if (profile.kind === 'unavailable') {
    if (isDashboardRoute || isConsentRoute) {
      return NextResponse.json(
        { message: 'Authentication service is temporarily unavailable. Please retry.' },
        { status: 503 },
      )
    }
    return clearLegacyRoleCookie(NextResponse.next())
  }

  if (profile.kind === 'unauthorized') {
    const response = isDashboardRoute || isConsentRoute
      ? NextResponse.redirect(new URL('/login', request.url))
      : NextResponse.next()
    response.cookies.delete('auth_token')
    return clearLegacyRoleCookie(response)
  }

  const role = profile.role
  if (isLoginRoute || isHomeRoute) {
    const response = NextResponse.redirect(new URL(ROLE_DASHBOARD_MAP[role] || '/login', request.url))
    return clearLegacyRoleCookie(response)
  }

  if (isDashboardRoute) {
    const matchedRoute = Object.keys(DASHBOARD_ROLE_MAP)
      .sort((a, b) => b.length - a.length)
      .find((route) => pathname === route || pathname.startsWith(route + '/'))

    if (!matchedRoute) {
      return clearLegacyRoleCookie(NextResponse.redirect(new URL('/login', request.url)))
    }

    const requiredRole = DASHBOARD_ROLE_MAP[matchedRoute]
    if (role !== requiredRole) {
      return clearLegacyRoleCookie(
        NextResponse.redirect(new URL(ROLE_DASHBOARD_MAP[role] || '/login', request.url)),
      )
    }
  }

  return clearLegacyRoleCookie(NextResponse.next())
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
