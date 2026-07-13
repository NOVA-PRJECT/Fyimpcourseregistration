import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { DASHBOARD_ROLE_MAP, ROLE_DASHBOARD_MAP } from '@/core/security/routeConfig'
import { Role } from '@/core/constants/roles'
import { SUPABASE_COOKIE_OPTIONS } from '@/core/database/supabaseCookieOptions'



export async function middleware(request: NextRequest) {

  // Guard against missing environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      route: request.nextUrl.pathname,
      userID: 'system',
      role: 'system',
      operation: 'middleware_auth_guard',
      error: 'Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY) are missing.'
    }))
    return new NextResponse(
      JSON.stringify({ error: 'Internal Server Error: Missing system configuration' }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    )
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
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
      cookieOptions: SUPABASE_COOKIE_OPTIONS,
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const role = user?.app_metadata?.role as Role | undefined

  const pathname = request.nextUrl.pathname
  const isLoginRoute = pathname.startsWith('/login')
  const isDashboardRoute = pathname.startsWith('/dashboard')
  const isApiRoute = pathname.startsWith('/api')
  const isResetRoute = pathname.startsWith('/reset-password')
  if (isResetRoute) return response



  // API routes handle their own auth (for non-student or exempt routes)
  if (isApiRoute) return response

  // No user — clear user_role cookie and kick to login if accessing dashboard
  if (!user) {
    if (isDashboardRoute) {
      const redirectResponse = NextResponse.redirect(new URL('/login', request.url))
      redirectResponse.cookies.delete('user_role')
      return redirectResponse
    }
    // Clear stale user_role cookie if present on non-dashboard routes
    const hasStaleCookie = request.cookies.get('user_role')?.value
    if (hasStaleCookie) {
      response.cookies.delete('user_role')
    }
  }

  // Logged in user tries to access login or home page — send to their dashboard
  const isHomeRoute = pathname === '/'
  if (user && (isLoginRoute || isHomeRoute)) {
    if (role && ROLE_DASHBOARD_MAP[role]) {
      return NextResponse.redirect(new URL(ROLE_DASHBOARD_MAP[role], request.url))
    }
    // Role not yet synced to app_metadata — redirect to login to re-authenticate
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Logged in user tries to access a dashboard — check their role (from JWT claims only)
  if (user && isDashboardRoute) {
    if (!role) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const matchedRoute = Object.keys(DASHBOARD_ROLE_MAP).find(route =>
      pathname.startsWith(route)
    )

    if (!matchedRoute) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const requiredRole = DASHBOARD_ROLE_MAP[matchedRoute]
    if (role !== requiredRole) {
      const fallback = ROLE_DASHBOARD_MAP[role] || '/login'
      return NextResponse.redirect(new URL(fallback, request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}