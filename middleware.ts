import { getToken } from 'next-auth/jwt'
import { NextRequest, NextResponse } from 'next/server'

const ROLE_DASHBOARD_MAP: Record<string, string> = {
  superadmin: '/dashboard/superadmin',
  campus_director: '/dashboard/director',
  hod: '/dashboard/hod',
  teaching_staff: '/dashboard/teacher',
  student: '/dashboard/student',
}

const DASHBOARD_ROLE_MAP: Record<string, string> = {
  '/dashboard/superadmin': 'superadmin',
  '/dashboard/director': 'campus_director',
  '/dashboard/hod': 'hod',
  '/dashboard/teacher': 'teaching_staff',
  '/dashboard/student': 'student',
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // These routes never need auth
  if (pathname.startsWith('/api')) return NextResponse.next()
  if (pathname.startsWith('/reset-password')) return NextResponse.next()

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  const isDashboard = pathname.startsWith('/dashboard')
  const isLogin = pathname === '/login'

  // Not logged in trying to access dashboard
  if (!token && isDashboard) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Logged in trying to access login page
  if (token && isLogin) {
    const role = token.role as string
    const redirectTo = ROLE_DASHBOARD_MAP[role] ?? '/login'
    return NextResponse.redirect(new URL(redirectTo, request.url))
  }

  // Logged in accessing a dashboard — verify correct role
  if (token && isDashboard) {
    const role = token.role as string

    const matchedRoute = Object.keys(DASHBOARD_ROLE_MAP).find(route =>
      pathname.startsWith(route)
    )

    if (!matchedRoute) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const requiredRole = DASHBOARD_ROLE_MAP[matchedRoute]

    if (role !== requiredRole) {
      return NextResponse.redirect(
        new URL(ROLE_DASHBOARD_MAP[role] ?? '/login', request.url)
      )
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}