import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/core/database/supabaseAdmin'
import { verifyHod, handleAuthError } from '@/core/auth/verifyRole'
import { logServerError } from '@/core/logging/logger'

export const dynamic = 'force-dynamic'

export interface StudentExcelRow {
  sl_no: number
  name: string
  sem: number
  paper_1: string
  paper_2: string
  paper_3: string
  paper_4: string
  paper_5: string
  paper_6: string
}

export async function GET(request: NextRequest) {
  const auth = await verifyHod()
  if (!auth.success) return handleAuthError(auth)

  const { searchParams } = new URL(request.url)
  const semesterParam = searchParams.get('semester')
  const semesterFilter = semesterParam && semesterParam !== 'all' ? Number(semesterParam) : null

  try {
    // 1. Fetch campus settings to get academic year
    const { data: settings } = await supabaseAdmin
      .from('campus_settings')
      .select('academic_year')
      .eq('campus_id', auth.campus_id)
      .single()

    const academicYear = settings?.academic_year ?? ''

    // 2. Fetch students for HOD's department and campus
    let studentsQuery = supabaseAdmin
      .from('students')
      .select('id, full_name, current_semester')
      .eq('department_id', auth.department_id)
      .eq('campus_id', auth.campus_id)
      .order('current_semester', { ascending: true })
      .order('full_name', { ascending: true })

    if (semesterFilter !== null && !isNaN(semesterFilter)) {
      studentsQuery = studentsQuery.eq('current_semester', semesterFilter) as typeof studentsQuery
    }

    const { data: students, error: studentsError } = await studentsQuery

    if (studentsError) {
      logServerError('/api/hod/export-students-excel', studentsError, { userId: auth.userId })
      return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 })
    }

    if (!students || students.length === 0) {
      return NextResponse.json({ rows: [] })
    }

    const studentIds = students.map((s: { id: string }) => s.id)

    // 3. Fetch registrations for these students
    const { data: registrations, error: regError } = await supabaseAdmin
      .from('student_registrations')
      .select(`
        student_id,
        semester,
        slot_1_course_id,
        slot_2_course_id,
        slot_3_course_id,
        slot_4_course_id,
        slot_5_course_id,
        slot_6_course_id
      `)
      .eq('academic_year', academicYear)
      .in('student_id', studentIds)

    if (regError) {
      logServerError('/api/hod/export-students-excel', regError, { userId: auth.userId })
      return NextResponse.json({ error: 'Failed to fetch student registrations' }, { status: 500 })
    }

    // 4. Collect all course IDs referenced across all slots
    const courseIdsSet = new Set<string>()
    const regMap = new Map<string, any>()

    for (const reg of (registrations ?? [])) {
      // Key by student_id:semester or student_id
      regMap.set(`${reg.student_id}:${reg.semester}`, reg)
      regMap.set(reg.student_id, reg)

      if (reg.slot_1_course_id) courseIdsSet.add(reg.slot_1_course_id)
      if (reg.slot_2_course_id) courseIdsSet.add(reg.slot_2_course_id)
      if (reg.slot_3_course_id) courseIdsSet.add(reg.slot_3_course_id)
      if (reg.slot_4_course_id) courseIdsSet.add(reg.slot_4_course_id)
      if (reg.slot_5_course_id) courseIdsSet.add(reg.slot_5_course_id)
      if (reg.slot_6_course_id) courseIdsSet.add(reg.slot_6_course_id)
    }

    // 5. Fetch course details for collected course IDs
    const courseMap = new Map<string, string>()
    if (courseIdsSet.size > 0) {
      const { data: courses } = await supabaseAdmin
        .from('courses')
        .select('id, course_code, title')
        .in('id', Array.from(courseIdsSet))

      for (const course of (courses ?? [])) {
        // Format as: "CODE - Title" (e.g. "CS101 - Programming in C")
        const label = course.title ? `${course.course_code} - ${course.title}` : course.course_code
        courseMap.set(course.id, label)
      }
    }

    // 6. Build response rows: Sl No, Name, Sem, Paper 1, Paper 2, Paper 3, Paper 4, Paper 5, Paper 6
    const rows: StudentExcelRow[] = students.map((s: { id: string; full_name: string; current_semester: number }, index: number) => {
      const reg = regMap.get(`${s.id}:${s.current_semester}`) || regMap.get(s.id)

      return {
        sl_no: index + 1,
        name: s.full_name,
        sem: s.current_semester,
        paper_1: reg?.slot_1_course_id ? courseMap.get(reg.slot_1_course_id) || 'Unknown Course' : '',
        paper_2: reg?.slot_2_course_id ? courseMap.get(reg.slot_2_course_id) || 'Unknown Course' : '',
        paper_3: reg?.slot_3_course_id ? courseMap.get(reg.slot_3_course_id) || 'Unknown Course' : '',
        paper_4: reg?.slot_4_course_id ? courseMap.get(reg.slot_4_course_id) || 'Unknown Course' : '',
        paper_5: reg?.slot_5_course_id ? courseMap.get(reg.slot_5_course_id) || 'Unknown Course' : '',
        paper_6: reg?.slot_6_course_id ? courseMap.get(reg.slot_6_course_id) || 'Unknown Course' : '',
      }
    })

    return NextResponse.json({ rows })
  } catch (error) {
    logServerError('/api/hod/export-students-excel', error, { userId: auth.userId })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
