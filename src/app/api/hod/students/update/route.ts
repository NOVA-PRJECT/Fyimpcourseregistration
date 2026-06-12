import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/core/database/mongoose'
import { User } from '@/core/database/models/User'
import { verifyRole } from '@/core/security/auth'
import mongoose from 'mongoose'

export const dynamic = 'force-dynamic'

export async function PUT(request: NextRequest) {
  const { user, error } = await verifyRole(['hod'])
  if (error) return error

  const body = await request.json()
  const { student_id, full_name, current_semester, program_id, roll_number } = body

  if (!student_id) {
    return NextResponse.json({ error: 'Student ID required' }, { status: 400 })
  }

  await connectDB()

  const student = await User.findById(student_id)
  if (!student || student.department_id?.toString() !== user.department_id || student.role !== 'student') {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  }

  try {
    if (full_name) student.full_name = full_name
    if (current_semester !== undefined) student.current_semester = Number(current_semester)
    if (program_id !== undefined) {
      student.program_id = program_id ? new mongoose.Types.ObjectId(program_id) : undefined
    }
    if (roll_number !== undefined) {
      student.roll_number = roll_number.trim() || undefined
    }
    await student.save()
    return NextResponse.json({ success: true, message: 'Student updated successfully' })
  } catch (err) {
    console.error('hod/students/update PUT failed:', err)
    return NextResponse.json({ error: 'Failed to update student' }, { status: 500 })
  }
}
