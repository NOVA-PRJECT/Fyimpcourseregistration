import { NextRequest, NextResponse } from 'next/server'
import { verifyStudent, handleAuthError } from '@/core/auth/verifyRole'
import { getPathwaySlots } from '@/modules/student/services/getPathwaySlots'

export async function GET(request: NextRequest) {
  const auth = await verifyStudent()
  if (!auth.success) return handleAuthError(auth)

  const { searchParams } = new URL(request.url)
  const pathwayId = searchParams.get('pathway_id')

  if (!pathwayId) {
    return NextResponse.json({ error: 'pathway_id is required' }, { status: 400 })
  }

  const response = await getPathwaySlots(auth, pathwayId)

  if (!response.success) {
    return NextResponse.json(
      { error: response.error },
      { status: response.status }
    )
  }

  return NextResponse.json(response)
}
