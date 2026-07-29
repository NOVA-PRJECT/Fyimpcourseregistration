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

  // 2. Fetch all departments belonging to this teacher's campus
  const { data: depts, error: deptsError } = await supabaseAdmin
    .from('departments')
    .select('id, name, code')
    .eq('campus_id', auth.campus_id)
    .order('name')

  if (deptsError) {
    return NextResponse.json({ error: 'Failed to fetch departments' }, { status: 500 })
  }

  const deptIds = depts?.map(d => d.id) ?? []

  // 3. Fetch all courses in these departments with semester & department_id
  const { data: courseList, error: coursesError } = await supabaseAdmin
    .from('courses')
    .select('id, course_code, title, semester, department_id')
    .in('department_id', deptIds)
    .order('title')

  if (coursesError) {
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 })
  }

  // 4. Get current academic year for registration count mapping
  const { data: campusSettings } = await supabaseAdmin
    .from('campus_settings')
    .select('academic_year')
    .eq('campus_id', auth.campus_id)
    .single()

  const academicYear = campusSettings?.academic_year ?? ''

  // 5. Fetch student registrations to count enrollments per course
  const enrolledCounts: Record<string, number> = {}

  if (academicYear) {
    const { data: registrations } = await supabaseAdmin
      .from('student_registrations')
      .select(`
        slot_1_course_id,
        slot_2_course_id,
        slot_3_course_id,
        slot_4_course_id,
        slot_5_course_id,
        slot_6_course_id
      `)
      .eq('academic_year', academicYear)

    if (registrations) {
      for (const reg of registrations) {
        const slots = [
          reg.slot_1_course_id,
          reg.slot_2_course_id,
          reg.slot_3_course_id,
          reg.slot_4_course_id,
          reg.slot_5_course_id,
          reg.slot_6_course_id,
        ]
        for (const cid of slots) {
          if (cid) {
            enrolledCounts[cid] = (enrolledCounts[cid] || 0) + 1
          }
        }
      }
    }
  }

  const coursesWithCounts = (courseList ?? []).map(course => ({
    ...course,
    enrolled_count: enrolledCounts[course.id] || 0,
  }))

  return NextResponse.json({
    teacherName: faculty.full_name,
    departments: depts ?? [],
    courses: coursesWithCounts,
  })
}

