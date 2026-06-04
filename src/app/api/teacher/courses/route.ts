import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/core/database/mongoose'
import { CourseAssignment } from '@/core/database/models/CourseAssignment'
import { verifyRole } from '@/core/security/auth'
import mongoose from 'mongoose'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { user, error } = await verifyRole(['teaching_staff'])
  if (error) return error

  const { searchParams } = new URL(request.url)
  const academic_year = searchParams.get('academic_year')

  await connectDB()

  const query: any = { teacher_id: new mongoose.Types.ObjectId(user.id) }
  if (academic_year) {
    query.academic_year = academic_year
  }

  const assignments = await CourseAssignment.find(query)
    .populate('course_id', 'course_code title semester credits category')

  return NextResponse.json(assignments.map(a => ({
    id: a.course_id._id,
    course_code: (a.course_id as any).course_code,
    title: (a.course_id as any).title,
    semester: (a.course_id as any).semester,
    academic_year: a.academic_year,
  })))
}
