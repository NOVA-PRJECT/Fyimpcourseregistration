/*
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/core/database/supabaseAdmin'
import { resetPasswordLimiter } from '@/core/security/rateLimiter'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const Schema = z.object({
  email: z.string().email().max(254),
})

export async function POST(request: NextRequest) {
  // Rate limiting — use resetPasswordLimiter to prevent email bombing / resource exhaustion
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
  const { success: withinLimit } = await resetPasswordLimiter.limit(ip)

  if (!withinLimit) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const result = Schema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  await supabaseAdmin.auth.resetPasswordForEmail(result.data.email,{
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password/confirm`,
  })

  return NextResponse.json({ success: true })
}
*/

export async function POST() {
  return new Response('Reset password feature is disabled', { status: 404 })
}
