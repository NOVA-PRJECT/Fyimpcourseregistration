import { NextResponse } from 'next/server'
import { verifyTeacher, handleAuthError } from '@/core/auth/verifyRole'
import { supabaseAdmin } from '@/core/database/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await verifyTeacher()
  if (!auth.success) return handleAuthError(auth)

  // 1. Get faculty (teacher) full name
  const { data: faculty, error: facultyError } = await supabaseAdmin
    .from('faculty')
    .select('full_name')
    .eq('id', auth.userId)
    .single()

  if (facultyError || !faculty) {
    return NextResponse.json({ error: 'Faculty profile not found' }, { status: 404 })
  }

  // 2. Find all department IDs belonging to this teacher's campus
  const { data: depts, error: deptsError } = await supabaseAdmin
    .from('departments')
    .select('id')
    .eq('campus_id', auth.campus_id)

  if (deptsError) {
    return NextResponse.json({ error: 'Failed to fetch departments' }, { status: 500 })
  }

  const deptIds = depts?.map(d => d.id) ?? []

  // 3. Fetch all courses in these departments
  const { data: courseList, error: coursesError } = await supabaseAdmin
    .from('courses')
    .select('id, course_code, title')
    .in('department_id', deptIds)
    .order('title')

  if (coursesError) {
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 })
  }

  return NextResponse.json({
    teacherName: faculty.full_name,
    courses: courseList ?? [],
  })
}
