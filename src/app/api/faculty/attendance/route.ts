import { NextRequest, NextResponse } from 'next/server'
import { getClassRoster } from '@/modules/teacher/services/getClassRoster'

export async function GET(request: NextRequest) {

  const { searchParams } = new URL(request.url)
  const courseId = searchParams.get('course_id')

  if (!courseId) {
    return NextResponse.json(
      { error: 'course_id parameter is required' },
      { status: 400 }
    )
  }

  const response = await getClassRoster(courseId)

  if (!response.success) {
    return NextResponse.json(
      { error: response.error },
      { status: response.status }
    )
  }

  return NextResponse.json(response.data)
}