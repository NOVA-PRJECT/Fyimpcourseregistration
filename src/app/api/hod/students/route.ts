import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/core/database/mongoose'
import { User } from '@/core/database/models/User'
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

  const students = await User.find({
    role: 'student',
    department_id: new mongoose.Types.ObjectId(user.department_id!),
    current_semester: Number(semester),
    is_active: true,
  }).select('id full_name current_semester cap_application_number roll_number email')

  return NextResponse.json(students.map(s => ({
    id: s._id,
    full_name: s.full_name,
    current_semester: s.current_semester,
    cap_application_number: s.cap_application_number,
    roll_number: s.roll_number,
    email: s.email,
  })))
}
