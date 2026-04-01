import { NextRequest, NextResponse } from 'next/server'
import { SignupStudentSchema, signupStudent } from '@/modules/student/services/signupStudent'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {

  const body = await request.json()
  const result = SignupStudentSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: result.error.flatten() },
      { status: 400 }
    )
  }

  const response = await signupStudent(result.data)

  if (!response.success) {
    return NextResponse.json(
      { error: response.error },
      { status: response.status }
    )
  }

  return NextResponse.json({ success: true })
}