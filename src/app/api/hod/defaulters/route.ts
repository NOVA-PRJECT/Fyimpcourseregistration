import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/core/database/mongoose'
import { User } from '@/core/database/models/User'
import { Preference } from '@/core/database/models/Preference'
import { verifyRole } from '@/core/security/auth'
import mongoose from 'mongoose'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { user, error } = await verifyRole(['hod'])
  if (error) return error

  const { searchParams } = new URL(request.url)
  const semester = searchParams.get('semester')
  if (!semester) {
    return NextResponse.json({ error: 'Semester required' }, { status: 400 })
  }

  await connectDB()

  // Get all active students in HOD's department for this semester
  const students = await User.find({
    department_id: new mongoose.Types.ObjectId(user.department_id!),
    role: 'student',
    current_semester: Number(semester),
    is_active: true,
  }).select('_id full_name roll_number cap_application_number')

  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const academic_year =
    month >= 6
      ? `${year}-${String(year + 1).slice(2)}`
      : `${year - 1}-${String(year).slice(2)}`

  // Get preferences submitted by students in this department for the current academic year + semester
  const preferences = await Preference.find({
    department_id: new mongoose.Types.ObjectId(user.department_id!),
    semester: Number(semester),
    academic_year,
  }).select('student_id')

  const submittedStudentIds = new Set(preferences.map(p => p.student_id.toString()))

  const defaulters = students.filter(student => !submittedStudentIds.has(student._id.toString()))

  return NextResponse.json({
    total_students: students.length,
    submitted_count: submittedStudentIds.size,
    defaulter_count: defaulters.length,
    defaulters: defaulters.map(d => ({
      id: d._id,
      full_name: d.full_name,
      roll_number: d.roll_number,
    })),
  })
}
