import { NextRequest, NextResponse } from 'next/server'
import { DASHBOARD_ROLE_MAP, ROLE_DASHBOARD_MAP } from '@/core/security/routeConfig'
import { Role } from '@/core/constants/roles'

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
  const userRole = request.cookies.get('user_role')?.value as Role | undefined

  // Not authenticated
  if (!authToken || !userRole) {
    if (isDashboardRoute) {
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

  // Guarding dashboard routes based on user role
  if (isDashboardRoute) {
    const matchedRoute = Object.keys(DASHBOARD_ROLE_MAP).find(route =>
      pathname.startsWith(route)
    )

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