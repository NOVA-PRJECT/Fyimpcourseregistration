import { NextResponse } from 'next/server'
import { checkApprovalStatus } from '@/modules/student/services/checkApprovalStatus'

export const dynamic = 'force-dynamic'

export async function GET() {

  const response = await checkApprovalStatus()

  if (!response.success) {
    return NextResponse.json(
      { error: response.error },
      { status: response.status }
    )
  }

  return NextResponse.json(response.data)
}