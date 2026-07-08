import { NextRequest, NextResponse } from 'next/server'
import { getClassRoster } from '@/modules/teacher/services/getClassRoster'
import { verifyTeacher, handleAuthError } from '@/core/auth/verifyRole'
import { supabaseAdmin } from '@/core/database/supabaseAdmin'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// GET — Returns class roster for a given course
export async function GET(request: NextRequest) {
  const auth = await verifyTeacher()
  if (!auth.success) return handleAuthError(auth)

  const { searchParams } = new URL(request.url)
  const courseId = searchParams.get('course_id')

  if (!courseId) {
    return NextResponse.json({ error: 'course_id parameter is required' }, { status: 400 })
  }

  const response = await getClassRoster(courseId, auth.campus_id)

  if (!response.success) {
    return NextResponse.json({ error: response.error }, { status: response.status })
  }

  return NextResponse.json(response.data)
}