import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/core/database/mongoose'
import { InternalMark } from '@/core/database/models/InternalMark'
import { verifyRole } from '@/core/security/auth'
import mongoose from 'mongoose'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { user, error } = await verifyRole(['teaching_staff'])
  if (error) return error

  const { searchParams } = new URL(request.url)
  const course_id = searchParams.get('course_id')
  const academic_year = searchParams.get('academic_year')

  if (!course_id || !academic_year) {
    return NextResponse.json({ error: 'Course ID and Academic Year required' }, { status: 400 })
  }

  await connectDB()

  const marks = await InternalMark.find({
    course_id: new mongoose.Types.ObjectId(course_id),
    academic_year,
  })

  return NextResponse.json(marks)
}

export async function POST(request: NextRequest) {
  const { user, error } = await verifyRole(['teaching_staff'])
  if (error) return error

  const body = await request.json()
  const { student_id, course_id, course_code, semester, academic_year, component, score, max_score } = body

  if (!student_id || !course_id || !course_code || !semester || !academic_year || !component || score === undefined || !max_score) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  await connectDB()

  try {
    const mark = await InternalMark.create({
      student_id: new mongoose.Types.ObjectId(student_id),
      course_id: new mongoose.Types.ObjectId(course_id),
      course_code,
      semester,
      academic_year,
      component,
      score,
      max_score,
      entered_by: new mongoose.Types.ObjectId(user.id),
    })
    return NextResponse.json({ success: true, mark })
  } catch (err) {
    console.error('teacher/marks POST failed:', err)
    return NextResponse.json({ error: 'Failed to add mark' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const { user, error } = await verifyRole(['teaching_staff'])
  if (error) return error

  const body = await request.json()
  const { mark_id, score, max_score } = body

  if (!mark_id) {
    return NextResponse.json({ error: 'Mark ID required' }, { status: 400 })
  }

  await connectDB()

  const mark = await InternalMark.findById(mark_id)
  if (!mark || mark.entered_by.toString() !== user.id) {
    return NextResponse.json({ error: 'Mark not found or unauthorized' }, { status: 404 })
  }

  try {
    if (score !== undefined) mark.score = score
    if (max_score !== undefined) mark.max_score = max_score
    await mark.save()
    return NextResponse.json({ success: true, message: 'Mark updated successfully' })
  } catch (err) {
    console.error('teacher/marks PUT failed:', err)
    return NextResponse.json({ error: 'Failed to update mark' }, { status: 500 })
  }
}
