import { NextRequest, NextResponse } from 'next/server'
import { getDefaulters } from '@/modules/hod/services/getDefaulters'

export async function GET(request: NextRequest) {

  const { searchParams } = new URL(request.url)
  const semesterParam = searchParams.get('semester')

  if (!semesterParam) {
    return NextResponse.json(
      { error: 'Semester parameter is required' },
      { status: 400 }
    )
  }

  const semester = parseInt(semesterParam)

  if (isNaN(semester) || semester < 1 || semester > 10) {
    return NextResponse.json(
      { error: 'Invalid semester value' },
      { status: 400 }
    )
  }

  const response = await getDefaulters(semester)

  if (!response.success) {
    return NextResponse.json(
      { error: response.error },
      { status: response.status }
    )
  }

  return NextResponse.json(response.data)
}