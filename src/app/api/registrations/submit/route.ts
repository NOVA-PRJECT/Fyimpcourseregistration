import { NextRequest, NextResponse } from 'next/server'
import { SubmitCoursesSchema } from '@/modules/student/schemas/submitSchema'
import { submitCourses } from '@/modules/student/services/submitCourses'
import { verifyStudent, handleAuthError } from '@/core/auth/verifyRole'
import { submitLimiter } from '@/core/security/rateLimiter'

export async function POST(request: NextRequest) {
  // Auth guard — verify the caller is a valid student
  const auth = await verifyStudent()
  if (!auth.success) return handleAuthError(auth)

  // Rate limit by student user ID
  const { success: withinLimit } = await submitLimiter.limit(auth.userId)
  if (!withinLimit) {
    return NextResponse.json(
      { error: 'Too many submission attempts. Please try again later.' },
      { status: 429 }
    )
  }

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

  const response = await submitCourses(auth, result.data)

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