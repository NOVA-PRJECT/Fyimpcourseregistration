import { NextRequest, NextResponse } from 'next/server'
import { VerifySchema } from '@/modules/student/schemas/eligibilitySchema'
import { verifyFresher } from '@/modules/student/services/verifyFresher'

export async function POST(request: NextRequest) {

  const body = await request.json()
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

  return NextResponse.json({ success: true })
}