import { NextRequest, NextResponse } from 'next/server'
import { SubmitCoursesSchema } from '@/modules/student/schemas/submitSchema'
import { submitCourses } from '@/modules/student/services/submitCourses'

export async function POST(request: NextRequest) {

  const body = await request.json()
  const result = SubmitCoursesSchema.safeParse(body)

  if (!result.success) {
  return NextResponse.json(
    { error: JSON.stringify(result.error.flatten()) },
    { status: 400 }
  )
}

  const response = await submitCourses(result.data)

  if (!response.success) {
    return NextResponse.json(
      { error: response.error },
      { status: response.status }
    )
  }

  return NextResponse.json({
    success: true,
    message: response.message,
    total_credits: response.total_credits,
  })
}