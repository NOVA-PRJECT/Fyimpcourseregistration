import { NextRequest, NextResponse } from 'next/server'
import { SubmitCoursesSchema } from '@/modules/student/schemas/submitSchema'
import { submitCourses } from '@/modules/student/services/submitCourses'

export async function POST(request: NextRequest) {

  const body = await request.json()
  const result = SubmitCoursesSchema.safeParse(body)

  if (!result.success) {
  const errors = result.error.flatten()
  
  // Extract the first meaningful error message
  const firstFieldError = Object.values(errors.fieldErrors)[0]?.[0]
  const firstFormError = errors.formErrors[0]
  const message = firstFieldError ?? firstFormError ?? 'Invalid input'

  return NextResponse.json(
    { error: message },
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