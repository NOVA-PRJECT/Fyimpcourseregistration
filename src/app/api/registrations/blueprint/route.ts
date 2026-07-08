import { NextResponse } from 'next/server'
import { verifyStudent, handleAuthError } from '@/core/auth/verifyRole'
import { getBlueprint } from '@/modules/student/services/getBlueprint'

export async function GET() {
  // Auth guard — verify the caller is a valid student
  const auth = await verifyStudent()
  if (!auth.success) return handleAuthError(auth)

  const response = await getBlueprint(auth)

  if (!response.success) {
    return NextResponse.json(
      { error: response.error },
      { status: response.status }
    )
  }

  return NextResponse.json(response)
}