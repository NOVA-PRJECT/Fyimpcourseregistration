import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/core/database/mongoose'
import { User } from '@/core/database/models/User'
import { verifyRole } from '@/core/security/auth'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const { user, error } = await verifyRole(['hod'])
  if (error) return error

  const body = await request.json()
  const { full_name, cap_application_number, date_of_birth, email, program_id, current_semester } = body

  if (!full_name || !cap_application_number || !date_of_birth) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  await connectDB()

  const existingStudent = await User.findOne({
    $or: [{ cap_application_number }, { email: email?.toLowerCase() }]
  })

  if (existingStudent) {
    return NextResponse.json({ error: 'Student with this CAP number or email already exists' }, { status: 409 })
  }

  const hashedPassword = await bcrypt.hash(date_of_birth, 12)
  const dummyEmail = email || `${cap_application_number.toLowerCase()}@student.kannuruniversity.ac.in`

  try {
    const student = await User.create({
      full_name,
      email: dummyEmail.toLowerCase().trim(),
      password: hashedPassword,
      role: 'student',
      department_id: user.department_id,
      program_id: program_id ? new mongoose.Types.ObjectId(program_id) : undefined,
      current_semester: current_semester ? Number(current_semester) : 1,
      cap_application_number,
      is_active: true,
    })
    return NextResponse.json({ success: true, id: student._id })
  } catch (err) {
    console.error('hod/students/add POST failed:', err)
    return NextResponse.json({ error: 'Failed to add student' }, { status: 500 })
  }
}
