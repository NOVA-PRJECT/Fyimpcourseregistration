import { NextResponse } from 'next/server'
import { verifyStudent } from '@/core/auth/verifyRole'
import { getBlueprint } from '@/modules/student/services/getBlueprint'

export async function GET() {

  // C1 fix: Auth guard — verify the caller is a valid student
  const auth = await verifyStudent()
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const response = await getBlueprint()

  if (!response.success) {
    return NextResponse.json(
      { error: response.error },
      { status: response.status }
    )
  }

  return NextResponse.json(response)
}