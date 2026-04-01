import { NextRequest, NextResponse } from 'next/server'
import { rejectStudent } from '@/modules/hod/services/rejectStudent'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const { student_id } = await request.json()

  if (!student_id) {
    return NextResponse.json(
      { error: 'student_id is required' },
      { status: 400 }
    )
  }

  const response = await rejectStudent(student_id)

  if (!response.success) {
    return NextResponse.json(
      { error: response.error },
      { status: response.status }
    )
  }

  return NextResponse.json({ success: true, message: response.message })
}