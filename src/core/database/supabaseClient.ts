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
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
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
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
            cookiesToSetAtEnd.push({ name, value, options })
          })
        },
      },
      cookieOptions: SUPABASE_COOKIE_OPTIONS,
    }
  )

  return { client, cookiesToSetAtEnd }
}