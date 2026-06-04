import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/core/database/mongoose'
import { Course } from '@/core/database/models/Course'
import { verifyRole } from '@/core/security/auth'
import mongoose from 'mongoose'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const CourseSchema = z.object({
  course_code: z.string().min(1, 'Course code is required'),
  title: z.string().min(1, 'Title is required'),
  semester: z.number().int().min(1).max(10),
  credits: z.number().int().min(1),
  category: z.enum(['INT','FWD','RPH','CIP','DSS','DSC','DSE','VAC','SEC','MDC','MOOC','AEC']),
  tag: z.string().optional().or(z.literal('')),
})

export async function GET(request: NextRequest) {
  const { user, error } = await verifyRole(['hod'])
  if (error) return error

  const { searchParams } = new URL(request.url)
  const semester = searchParams.get('semester')

  await connectDB()

  const query: any = { department_id: new mongoose.Types.ObjectId(user.department_id!) }
  if (semester) {
    query.semester = Number(semester)
  }

  const courses = await Course.find(query).sort({ semester: 1, category: 1, title: 1 })
  return NextResponse.json(courses)
}

export async function POST(request: NextRequest) {
  const { user, error } = await verifyRole(['hod'])
  if (error) return error

  const body = await request.json()
  const parsed = CourseSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  await connectDB()

  try {
    const course = await Course.create({
      course_code: parsed.data.course_code,
      title: parsed.data.title,
      department_id: user.department_id,
      semester: parsed.data.semester,
      credits: parsed.data.credits,
      category: parsed.data.category,
      tag: parsed.data.tag || null,
    })
    return NextResponse.json({ success: true, message: 'Course added successfully', course })
  } catch (err: any) {
    if (err.code === 11000) {
      return NextResponse.json({ error: 'Course code already exists' }, { status: 409 })
    }
    console.error('hod/courses POST failed:', err)
    return NextResponse.json({ error: 'Failed to add course' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const { user, error } = await verifyRole(['hod'])
  if (error) return error

  const body = await request.json()
  const { id, ...rest } = body

  if (!id) {
    return NextResponse.json({ error: 'Course ID required' }, { status: 400 })
  }

  await connectDB()

  const course = await Course.findById(id)
  if (!course || course.department_id.toString() !== user.department_id) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  try {
    course.title = rest.title
    course.credits = rest.credits
    course.category = rest.category
    course.tag = rest.tag || null
    await course.save()
    return NextResponse.json({ success: true, message: 'Course updated successfully' })
  } catch (err) {
    console.error('hod/courses PUT failed:', err)
    return NextResponse.json({ error: 'Failed to update course' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const { user, error } = await verifyRole(['hod'])
  if (error) return error

  const { course_id } = await request.json()
  if (!course_id) {
    return NextResponse.json({ error: 'Course ID required' }, { status: 400 })
  }

  await connectDB()

  const course = await Course.findById(course_id)
  if (!course || course.department_id.toString() !== user.department_id) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  try {
    await Course.findByIdAndDelete(course_id)
    return NextResponse.json({ success: true, message: 'Course deleted successfully' })
  } catch (err) {
    console.error('hod/courses DELETE failed:', err)
    return NextResponse.json({ error: 'Failed to delete course' }, { status: 500 })
  }
}
