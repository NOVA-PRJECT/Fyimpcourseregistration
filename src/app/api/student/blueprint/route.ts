import { NextResponse } from 'next/server'
import { connectDB } from '@/core/database/mongoose'
import { Course } from '@/core/database/models/Course'
import { Preference } from '@/core/database/models/Preference'
import { User } from '@/core/database/models/User'
import { verifyRole } from '@/core/security/auth'
import mongoose from 'mongoose'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { user, error } = await verifyRole(['student'])
  if (error) return error

  await connectDB()

  // 1. Get student details with program populated
  const student = await User.findById(user.id).populate('program_id').lean()
  if (!student) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  }

  if (!student.program_id) {
    return NextResponse.json({ error: 'Student has no program assigned' }, { status: 400 })
  }

  const program: any = student.program_id
  const semester = student.current_semester ?? 1
  const papers_per_semester = program.papers_per_semester ?? 4

  // 2. Fetch all courses belonging to this program and semester
  const courses = await Course.find({
    program_id: program._id,
    semester: semester,
  }).lean()

  // 3. Get existing preference submitted by the student, if any for this academic year & semester
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const academic_year =
    month >= 6
      ? `${year}-${String(year + 1).slice(2)}`
      : `${year - 1}-${String(year).slice(2)}`

  const existingPreference = await Preference.findOne({
    student_id: new mongoose.Types.ObjectId(user.id),
    semester,
    academic_year,
  }).lean()

  return NextResponse.json({
    papers_per_semester,
    courses: courses.map(c => ({
      id: c._id.toString(),
      course_code: c.course_code,
      title: c.title,
      credits: c.credits,
    })),
    existing: existingPreference ?? null,
  })
}
