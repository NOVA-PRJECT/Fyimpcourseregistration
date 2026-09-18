import { NextRequest, NextResponse } from 'next/server'
import { DASHBOARD_ROLE_MAP, ROLE_DASHBOARD_MAP } from '@/core/security/routeConfig'
import { Role, ROLES } from '@/core/constants/roles'

function extractTokenClaims(token: string): { role: Role | null; isExpired: boolean } {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return { role: null, isExpired: true }

    const base64Url = parts[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    const payload = JSON.parse(jsonPayload)

    const isExpired = typeof payload.exp === 'number' && Date.now() >= payload.exp * 1000
    const rawRole = payload.app_metadata?.role || payload.role
    const validRoles = Object.values(ROLES) as string[]
    const role = validRoles.includes(rawRole) ? (rawRole as Role) : null

    return { role, isExpired }
  } catch {
    return { role: null, isExpired: true }
  }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isLoginRoute = pathname.startsWith('/login')
  const isDashboardRoute = pathname.startsWith('/dashboard')
  const isApiRoute = pathname.startsWith('/api')

  // API routes are proxied directly to NestJS backend
  if (isApiRoute) {
    return NextResponse.next()
  }

  const authToken = request.cookies.get('auth_token')?.value
  const cookieRole = request.cookies.get('user_role')?.value as Role | undefined

  let userRole: Role | null = null
  let isExpired = false

  if (authToken) {
    const claims = extractTokenClaims(authToken)
    userRole = claims.role
    isExpired = claims.isExpired
  }

  // Fallback to cookie role only if JWT claims role wasn't found, but if expired or missing token -> reject
  if (!userRole && cookieRole && !authToken) {
    userRole = null
  } else if (!userRole && cookieRole) {
    userRole = cookieRole
  }

  const isConsentRoute = pathname.startsWith('/consent')

  // Not authenticated or token expired
  if (!authToken || !userRole || isExpired) {
    if (isDashboardRoute || isConsentRoute) {
      const redirectResponse = NextResponse.redirect(new URL('/login', request.url))
      redirectResponse.cookies.delete('user_role')
      redirectResponse.cookies.delete('auth_token')
      return redirectResponse
    }
    return NextResponse.next()
  }

  // Already logged in - trying to access login or root page
  const isHomeRoute = pathname === '/'
  if (isLoginRoute || isHomeRoute) {
    if (userRole && ROLE_DASHBOARD_MAP[userRole]) {
      return NextResponse.redirect(new URL(ROLE_DASHBOARD_MAP[userRole], request.url))
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Guarding dashboard routes based on authoritative user role
  if (isDashboardRoute) {
    const matchedRoute = Object.keys(DASHBOARD_ROLE_MAP)
      .sort((a, b) => b.length - a.length)
      .find((route) => pathname === route || pathname.startsWith(route + '/'))

    if (!matchedRoute) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const requiredRole = DASHBOARD_ROLE_MAP[matchedRoute]
    if (userRole !== requiredRole) {
      const fallback = ROLE_DASHBOARD_MAP[userRole] || '/login'
      return NextResponse.redirect(new URL(fallback, request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}