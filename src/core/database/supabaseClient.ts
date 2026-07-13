import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { SUPABASE_COOKIE_OPTIONS } from './supabaseCookieOptions'

export { SUPABASE_COOKIE_OPTIONS }

export async function getSupabaseServerClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
      cookieOptions: SUPABASE_COOKIE_OPTIONS,
    }
  )
}

export async function createResponseTrackingClient() {
  const cookieStore = await cookies()
  const cookiesToSetAtEnd: { name: string; value: string; options: any }[] = []

  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
              cookiesToSetAtEnd.push({ name, value, options })
            })
          } catch {
            // Can be ignored if called from a Server Component.
          }
        },
      },
      cookieOptions: SUPABASE_COOKIE_OPTIONS,
    }
  )

  return { client, cookiesToSetAtEnd }
}