import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/core/database/mongoose'
import { User } from '@/core/database/models/User'
import { Preference } from '@/core/database/models/Preference'
import { verifyRole } from '@/core/security/auth'

export const dynamic = 'force-dynamic'

export async function DELETE(request: NextRequest) {
  const { user, error } = await verifyRole(['hod'])
  if (error) return error

  const { student_id } = await request.json()
  if (!student_id) {
    return NextResponse.json({ error: 'Student ID required' }, { status: 400 })
  }

  await connectDB()

  const student = await User.findById(student_id)
  if (!student || student.department_id?.toString() !== user.department_id || student.role !== 'student') {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  }

  try {
    await User.findByIdAndDelete(student_id)
    await Preference.deleteMany({ student_id })
    return NextResponse.json({ success: true, message: 'Student removed successfully' })
  } catch (err) {
    console.error('hod/students/remove DELETE failed:', err)
    return NextResponse.json({ error: 'Failed to remove student' }, { status: 500 })
  }
}
