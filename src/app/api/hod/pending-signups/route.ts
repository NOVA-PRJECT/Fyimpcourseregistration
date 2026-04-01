import { NextResponse } from 'next/server'
import { getPendingStudents } from '@/modules/hod/services/getPendingStudents'

export const dynamic = 'force-dynamic'

export async function GET() {
  const response = await getPendingStudents()

  if (!response.success) {
    return NextResponse.json(
      { error: response.error },
      { status: response.status }
    )
  }

  return NextResponse.json(response.data)
}