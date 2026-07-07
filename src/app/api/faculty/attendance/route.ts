import { NextRequest, NextResponse } from 'next/server'
import { getClassRoster } from '@/modules/teacher/services/getClassRoster'
import { verifyTeacher } from '@/core/auth/verifyRole'
import { supabaseAdmin } from '@/core/database/supabaseAdmin'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// ── GET: Returns roster + existing attendance for a given course/month/year ──
export async function GET(request: NextRequest) {
  const auth = await verifyTeacher()
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { searchParams } = new URL(request.url)
  const courseId = searchParams.get('course_id')
  const monthParam = searchParams.get('month') // 1-12
  const yearParam = searchParams.get('year')   // e.g. 2026

  if (!courseId) {
    return NextResponse.json({ error: 'course_id parameter is required' }, { status: 400 })
  }

  const response = await getClassRoster(courseId, auth.campus_id)

  if (!response.success) {
    return NextResponse.json({ error: response.error }, { status: response.status })
  }

  // If month/year supplied, also fetch existing attendance records
  if (monthParam && yearParam) {
    const month = parseInt(monthParam, 10)
    const year = parseInt(yearParam, 10)

    if (isNaN(month) || month < 1 || month > 12 || isNaN(year)) {
      return NextResponse.json({ error: 'Invalid month or year' }, { status: 400 })
    }

    // Build date range for the month
    const startDate = new Date(year, month - 1, 1).toISOString().slice(0, 10)
    const endDate = new Date(year, month, 0).toISOString().slice(0, 10)

    const studentIds = response.data!.students.map((s: any) => s.id)

    const { data: attendanceRows, error: attError } = await supabaseAdmin
      .from('attendance')
      .select('student_id, date, status')
      .eq('course_id', courseId)
      .gte('date', startDate)
      .lte('date', endDate)
      .in('student_id', studentIds)

    if (attError) {
      console.error('faculty/attendance GET — attendance fetch failed:', attError)
      return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 })
    }

    // Shape as a lookup map: { [student_id]: { [date]: status } }
    const attendanceMap: Record<string, Record<string, string>> = {}
    for (const row of attendanceRows ?? []) {
      if (!attendanceMap[row.student_id]) attendanceMap[row.student_id] = {}
      attendanceMap[row.student_id][row.date] = row.status
    }

    return NextResponse.json({
      ...response.data,
      attendance: attendanceMap,
      month,
      year,
    })
  }

  return NextResponse.json(response.data)
}

// ── POST: Mark attendance for a course on a specific date ──

const AttendanceRecordSchema = z.object({
  student_id: z.string().uuid(),
  status: z.enum(['present', 'absent']),
})

const MarkAttendanceSchema = z.object({
  course_id: z.string().uuid('Invalid course ID'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  records: z.array(AttendanceRecordSchema).min(1, 'At least one record is required'),
})

export async function POST(request: NextRequest) {
  const auth = await verifyTeacher()
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = MarkAttendanceSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const { course_id, date, records } = parsed.data

  // Validate date is not in the future
  const markDate = new Date(date)
  const today = new Date()
  today.setHours(23, 59, 59, 999) // allow same-day marking
  if (markDate > today) {
    return NextResponse.json(
      { error: 'Cannot mark attendance for a future date' },
      { status: 400 }
    )
  }

  // Verify teacher has access to this course (via campus check)
  const rosterResult = await getClassRoster(course_id, auth.campus_id)
  if (!rosterResult.success) {
    return NextResponse.json({ error: rosterResult.error }, { status: rosterResult.status })
  }

  // Validate every submitted student_id is in the enrolled roster
  const enrolledIds = new Set(rosterResult.data!.students.map((s: any) => s.id))
  const invalidStudents = records.filter(r => !enrolledIds.has(r.student_id))
  if (invalidStudents.length > 0) {
    return NextResponse.json(
      { error: `Student(s) not enrolled in this course: ${invalidStudents.map(s => s.student_id).join(', ')}` },
      { status: 400 }
    )
  }

  // Upsert attendance rows via supabaseAdmin
  const upsertPayload = records.map(r => ({
    course_id,
    student_id: r.student_id,
    date,
    status: r.status,
    marked_by: auth.userId,
  }))

  const { error: upsertError } = await supabaseAdmin
    .from('attendance')
    .upsert(upsertPayload, { onConflict: 'course_id,student_id,date' })

  if (upsertError) {
    console.error('faculty/attendance POST — upsert failed:', upsertError)
    return NextResponse.json({ error: 'Failed to save attendance' }, { status: 500 })
  }

  return NextResponse.json({ success: true, marked: records.length })
}