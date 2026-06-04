import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/core/database/mongoose'
import { Allocation } from '@/core/database/models/Allocation'
import { Course } from '@/core/database/models/Course'
import { verifyRole } from '@/core/security/auth'
import mongoose from 'mongoose'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { user, error } = await verifyRole(['teaching_staff'])
  if (error) return error

  const { searchParams } = new URL(request.url)
  const course_id = searchParams.get('course_id')
  const academic_year = searchParams.get('academic_year')

  if (!course_id) {
    return NextResponse.json({ error: 'Course ID required' }, { status: 400 })
  }

  await connectDB()

  const course = await Course.findById(course_id).select('title course_code')
  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  const query: any = {
    'slots.course_id': new mongoose.Types.ObjectId(course_id),
    'slots.status': { $in: ['ALLOCATED', 'MANUALLY_ALLOCATED'] },
  }

  if (academic_year) {
    query.academic_year = academic_year
  }

  const allocations = await Allocation.find(query)
    .populate('student_id', 'full_name roll_number')
    .populate('department_id', 'name code')

  const students = allocations.map(a => {
    const student = a.student_id as any
    const dept = a.department_id as any
    return {
      id: student._id,
      full_name: student.full_name,
      roll_number: student.roll_number,
      department: dept.name,
      department_code: dept.code,
    }
  })

  // Sort by name
  students.sort((a, b) => a.full_name.localeCompare(b.full_name))

  return NextResponse.json({
    course: { id: course._id, title: course.title, course_code: course.course_code },
    total_students: students.length,
    department_breakdown: students.reduce((acc, s) => {
      acc[s.department_code] = (acc[s.department_code] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    students,
  })
}
