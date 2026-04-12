import { NextRequest, NextResponse } from 'next/server'
import { EligibilitySchema } from '@/modules/student/schemas/eligibilitySchema'
import { checkEligibility } from '@/modules/student/services/checkEligibility'
import { eligibilityLimiter } from '@/core/security/rateLimiter'

export async function POST(request: NextRequest) {

  // Rate limiting
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
  const { success } = await eligibilityLimiter.limit(ip)

  if (!success) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429 }
    )
  }

  // Parse body safely
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON' },
      { status: 400 }
    )
  }

  // Validate input
  const result = EligibilitySchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: result.error.flatten() },
      { status: 400 }
    )
  }

  // Business logic
  const response = await checkEligibility(result.data)

  if (!response.success) {
    return NextResponse.json(
      { error: response.error },
      { status: response.status }
    )
  }

  return NextResponse.json(response.data)
}