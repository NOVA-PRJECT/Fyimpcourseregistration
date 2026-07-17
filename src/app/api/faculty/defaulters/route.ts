import { NextRequest, NextResponse } from 'next/server'
import { getAllDepartmentStudents } from '@/modules/hod/services/getDefaulters'
import { verifyHod, handleAuthError } from '@/core/auth/verifyRole'

export const dynamic = 'force-dynamic'

// GET — returns all dept students with submission status; semester filter is optional
export async function GET(request: NextRequest) {
  const auth = await verifyHod()
  if (!auth.success) return handleAuthError(auth)

  const { searchParams } = new URL(request.url)
  const semesterParam = searchParams.get('semester')
  const parsedSemester = semesterParam ? Number(semesterParam) : NaN
  const semesterFilter = !isNaN(parsedSemester) && Number.isInteger(parsedSemester)
    ? parsedSemester
    : undefined

  const response = await getAllDepartmentStudents(
    auth.department_id,
    auth.campus_id,
    semesterFilter
  )

  if (!response.success) {
    return NextResponse.json({ error: response.error }, { status: response.status })
  }

  return NextResponse.json(response.data)
}