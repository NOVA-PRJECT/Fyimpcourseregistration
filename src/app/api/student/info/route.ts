import { NextResponse } from 'next/server'
import { connectDB } from '@/core/database/mongoose'
import { User } from '@/core/database/models/User'
import { Department } from '@/core/database/models/Department'
import { verifyRole } from '@/core/security/auth'

export const dynamic = 'force-dynamic'

// GET — returns the logged-in student's department, semester and roll number
export async function GET() {
  const { user, error } = await verifyRole(['student'])
  if (error) return error

  await connectDB()

  try {
    const student = await User.findById(user.id).lean()
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    let department_name = 'Not Assigned'
    if (student.department_id) {
      const dept = await Department.findById(student.department_id).lean()
      if (dept) department_name = dept.name
    }

    return NextResponse.json({
      department_name,
      semester: student.current_semester ?? 1,
      roll_number: student.roll_number ?? null,
    })
  } catch (err: any) {
    console.error('student/info GET failed:', err)
    return NextResponse.json({ error: 'Failed to fetch student info' }, { status: 500 })
  }
}
