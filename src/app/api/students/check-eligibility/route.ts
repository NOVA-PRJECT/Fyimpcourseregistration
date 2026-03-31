import { NextRequest, NextResponse } from 'next/server'
import { EligibilitySchema } from '@/modules/student/schemas/eligibilitySchema'
import { checkEligibility } from '@/modules/student/services/checkEligibility'

export async function POST(request: NextRequest) {

  const body = await request.json()
  const result = EligibilitySchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: result.error.flatten() },
      { status: 400 }
    )
  }

  const response = await checkEligibility(result.data)

  if (!response.success) {
    return NextResponse.json(
      { error: response.error },
      { status: response.status }
    )
  }

  return NextResponse.json(response.data)
}