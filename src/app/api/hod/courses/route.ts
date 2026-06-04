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
  program_id: z.string().min(1, 'Program is required'),
})

export async function GET(request: NextRequest) {
  const { user, error } = await verifyRole(['hod'])
  if (error) return error

  const { searchParams } = new URL(request.url)
  const semester = searchParams.get('semester')
  const program_id = searchParams.get('program_id')

  await connectDB()

  const query: any = { department_id: new mongoose.Types.ObjectId(user.department_id!) }
  if (semester) {
    query.semester = Number(semester)
  }
  if (program_id) {
    query.program_id = new mongoose.Types.ObjectId(program_id)
  }

  try {
    const courses = await Course.find(query)
      .populate('program_id', 'name code')
      .sort({ semester: 1, category: 1, title: 1 })
      .lean()

    // Map `_id` to `id` for consistency if required by frontend
    const formattedCourses = courses.map((c: any) => ({
      id: c._id.toString(),
      _id: c._id.toString(),
      course_code: c.course_code,
      title: c.title,
      semester: c.semester,
      credits: c.credits,
      category: c.category,
      tag: c.tag,
      department_id: c.department_id.toString(),
      program_id: c.program_id ? {
        _id: c.program_id._id.toString(),
        name: c.program_id.name,
        code: c.program_id.code,
      } : null
    }))

    return NextResponse.json(formattedCourses)
  } catch (err: any) {
    console.error('hod/courses GET failed:', err)
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 })
  }
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
      department_id: new mongoose.Types.ObjectId(user.department_id!),
      program_id: new mongoose.Types.ObjectId(parsed.data.program_id),
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
  const { id, title, credits, category, tag, program_id, semester } = body

  if (!id) {
    return NextResponse.json({ error: 'Course ID required' }, { status: 400 })
  }

  await connectDB()

  try {
    const course = await Course.findById(id)
    if (!course || course.department_id.toString() !== user.department_id) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    if (title !== undefined) course.title = title
    if (credits !== undefined) course.credits = credits
    if (category !== undefined) course.category = category
    if (tag !== undefined) course.tag = tag || null
    if (program_id !== undefined) course.program_id = new mongoose.Types.ObjectId(program_id)
    if (semester !== undefined) course.semester = semester

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

  try {
    const course = await Course.findById(course_id)
    if (!course || course.department_id.toString() !== user.department_id) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    await Course.findByIdAndDelete(course_id)
    return NextResponse.json({ success: true, message: 'Course deleted successfully' })
  } catch (err) {
    console.error('hod/courses DELETE failed:', err)
    return NextResponse.json({ error: 'Failed to delete course' }, { status: 500 })
  }
}
