import { NextRequest, NextResponse } from 'next/server'
import { VerifySchema } from '@/modules/student/schemas/eligibilitySchema'
import { verifyFresher } from '@/modules/student/services/verifyFresher'
import { checkRateLimit, resetRateLimit } from '@/core/security/rateLimiter'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {

  const ip = request.headers.get('x-forwarded-for') ?? 'unknown'

  // Rate limit by IP — max 10 account creation attempts per hour per IP
  const ipAllowed = checkRateLimit(`verify:ip:${ip}`, 10, 60 * 60 * 1000)
  if (!ipAllowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429 }
    )
  }

  const body = await request.json()

  // Rate limit by CAP number — max 3 attempts per CAP number per hour
  // This prevents brute-forcing a specific student's account creation
  const capNumber = body?.cap_number ?? 'unknown'
  const capAllowed = checkRateLimit(`verify:cap:${capNumber}`, 3, 60 * 60 * 1000)
  if (!capAllowed) {
    return NextResponse.json(
      { error: 'Too many attempts for this CAP number. Please try again later.' },
      { status: 429 }
    )
  }

  const result = VerifySchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: result.error.flatten() },
      { status: 400 }
    )
  }

  const response = await verifyFresher(result.data)

  if (!response.success) {
    return NextResponse.json(
      { error: response.error },
      { status: response.status }
    )
  }

  // Reset rate limit on success — no need to block a legitimate user
  // who successfully created their account
  resetRateLimit(`verify:ip:${ip}`)
  resetRateLimit(`verify:cap:${capNumber}`)

  return NextResponse.json({ success: true })
}
