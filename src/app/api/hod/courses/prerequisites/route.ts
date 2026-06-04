import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/core/database/mongoose'
import { Course } from '@/core/database/models/Course'
import { verifyRole } from '@/core/security/auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const PrerequisiteSchema = z.object({
  type: z.enum(['PAPER_REQUIRED', 'PAPER_MIN_SCORE', 'DEPT_REQUIRED', 'DEPT_EXCLUDED', 'QUOTA_RESERVED']),
  course_code: z.string().optional(),
  min_score: z.number().optional(),
  department_code: z.string().optional(),
  seats: z.number().optional(),
})

const PrerequisiteSubmitSchema = z.object({
  course_id: z.string().min(1, 'Course ID is required'),
  prerequisites: z.array(PrerequisiteSchema),
})

export async function GET(request: NextRequest) {
  const { user, error } = await verifyRole(['hod'])
  if (error) return error

  const { searchParams } = new URL(request.url)
  const course_id = searchParams.get('course_id')
  if (!course_id) {
    return NextResponse.json({ error: 'Course ID required' }, { status: 400 })
  }

  await connectDB()

  const course = await Course.findById(course_id).select('department_id prerequisites')
  if (!course || course.department_id.toString() !== user.department_id) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  return NextResponse.json(course.prerequisites ?? [])
}

export async function PUT(request: NextRequest) {
  const { user, error } = await verifyRole(['hod'])
  if (error) return error

  const body = await request.json()
  const parsed = PrerequisiteSubmitSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  await connectDB()

  const course = await Course.findById(parsed.data.course_id)
  if (!course || course.department_id.toString() !== user.department_id) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  try {
    course.prerequisites = parsed.data.prerequisites as any
    await course.save()
    return NextResponse.json({ success: true, message: 'Prerequisites updated successfully' })
  } catch (err) {
    console.error('hod/courses/prerequisites PUT failed:', err)
    return NextResponse.json({ error: 'Failed to update prerequisites' }, { status: 500 })
  }
}
