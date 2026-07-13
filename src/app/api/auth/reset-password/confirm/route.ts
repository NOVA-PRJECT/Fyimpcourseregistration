import { NextRequest, NextResponse } from 'next/server'
import { createResponseTrackingClient } from '@/core/database/supabaseClient'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const Schema = z.object({
  code: z.string().min(1),
  new_password: z.string().min(8).max(128),
})

export async function POST(request: NextRequest) {
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const result = Schema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
  }

  const { client: supabase, cookiesToSetAtEnd } = await createResponseTrackingClient()

  // Exchange the PKCE code for a session server-side
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(result.data.code)
  if (exchangeError) {
    return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 })
  }

  // Update the password
  const { error: updateError } = await supabase.auth.updateUser({
    password: result.data.new_password,
  })
  if (updateError) {
    return NextResponse.json({ error: 'Failed to update password' }, { status: 500 })
  }

  const response = NextResponse.json({ success: true })
  cookiesToSetAtEnd.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options)
  })

  return response
}
