import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { DASHBOARD_ROLE_MAP, ROLE_DASHBOARD_MAP } from '@/core/security/routeConfig'
import { Role } from '@/core/constants/roles'

export async function middleware(request: NextRequest) {

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isLoginRoute = pathname.startsWith('/login')
  const isDashboardRoute = pathname.startsWith('/dashboard')
  const isApiRoute = pathname.startsWith('/api')

  // API routes handle their own auth
  if (isApiRoute) {
    return response
  }

  // No user — kick to login
  if (!user && isDashboardRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Logged in user tries to access login — send to their dashboard
  if (user && isLoginRoute) {
    const role = request.cookies.get('user_role')?.value as Role | undefined
    if (role && ROLE_DASHBOARD_MAP[role]) {
      return NextResponse.redirect(new URL(ROLE_DASHBOARD_MAP[role], request.url))
    }
    return NextResponse.redirect(new URL('/dashboard/student', request.url))
  }

  // Logged in user tries to access a dashboard — check their role
  if (user && isDashboardRoute) {
    const role = request.cookies.get('user_role')?.value as Role | undefined

    // No role cookie found — send to login
    if (!role) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Find which dashboard this route belongs to
    const matchedRoute = Object.keys(DASHBOARD_ROLE_MAP).find(route =>
      pathname.startsWith(route)
    )

    // Route not in map — deny
    if (!matchedRoute) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Role doesn't match this dashboard — send to correct dashboard
    const requiredRole = DASHBOARD_ROLE_MAP[matchedRoute]
    if (role !== requiredRole) {
      return NextResponse.redirect(new URL(ROLE_DASHBOARD_MAP[role], request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}