import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/core/database/mongoose'
import { Preference } from '@/core/database/models/Preference'
import { User } from '@/core/database/models/User'
import { Course } from '@/core/database/models/Course'
import { verifyRole } from '@/core/security/auth'
import { submitLimiter } from '@/core/security/rateLimiter'
import mongoose from 'mongoose'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const PreferenceItemSchema = z.object({
  rank: z.number().int().min(1),
  course_id: z.string().min(1),
})

const SlotSchema = z.object({
  slot: z.number().int().min(1).max(10),
  type: z.enum(['FIXED', 'ELECTIVE']),
  preferences: z.array(PreferenceItemSchema).min(1, 'At least one preference required per slot'),
})

const PreferenceSubmitSchema = z.object({
  slots: z.array(SlotSchema).min(1, 'At least one slot required'),
})

export async function POST(request: NextRequest) {
  const { user, error } = await verifyRole(['student'])
  if (error) return error

  const limitResult = await submitLimiter.limit(user.id)
  if (!limitResult.success) {
    return NextResponse.json(
      { error: 'Too many submissions. Please try again later.' },
      { status: 429 }
    )
  }

  const body = await request.json()
  const parsed = PreferenceSubmitSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  await connectDB()

  // Get student details with program
  const student = await User.findById(user.id).populate('program_id').select(
    'department_id campus_id current_semester program_id'
  )
  if (!student) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  }

  if (!student.program_id) {
    return NextResponse.json({ error: 'Student has no program assigned' }, { status: 400 })
  }

  const program: any = student.program_id
  const papers_per_semester = program.papers_per_semester ?? 4

  // Verify number of slots matches papers_per_semester
  if (parsed.data.slots.length !== papers_per_semester) {
    return NextResponse.json(
      { error: `You must select exactly ${papers_per_semester} papers.` },
      { status: 400 }
    )
  }

  // Verify all submitted course IDs exist and belong to student's program and semester
  const allCourseIds = parsed.data.slots.flatMap(s =>
    s.preferences.map(p => p.course_id)
  )
  const uniqueCourseIds = [...new Set(allCourseIds)]

  const courses = await Course.find({
    _id: { $in: uniqueCourseIds.map(id => new mongoose.Types.ObjectId(id)) },
    program_id: program._id,
    semester: student.current_semester,
  }).select('_id')

  if (courses.length !== uniqueCourseIds.length) {
    return NextResponse.json(
      { error: 'One or more selected courses are invalid for your program/semester' },
      { status: 400 }
    )
  }

  // Get current academic year
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const academic_year =
    month >= 6
      ? `${year}-${String(year + 1).slice(2)}`
      : `${year - 1}-${String(year).slice(2)}`

  // Upsert preference
  await Preference.findOneAndUpdate(
    {
      student_id: new mongoose.Types.ObjectId(user.id),
      semester: student.current_semester,
      academic_year,
    },
    {
      student_id: user.id,
      department_id: student.department_id,
      campus_id: student.campus_id,
      semester: student.current_semester,
      academic_year,
      submitted_at: new Date(),
      slots: parsed.data.slots,
    },
    { upsert: true, new: true }
  )

  return NextResponse.json({
    success: true,
    message: 'Preferences submitted successfully',
  })
}

// GET — student views their submitted preferences
export async function GET(request: NextRequest) {
  const { user, error } = await verifyRole(['student'])
  if (error) return error

  await connectDB()

  const student = await User.findById(user.id).select(
    'current_semester'
  )
  if (!student) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  }

  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const academic_year =
    month >= 6
      ? `${year}-${String(year + 1).slice(2)}`
      : `${year - 1}-${String(year).slice(2)}`

  const preference = await Preference.findOne({
    student_id: new mongoose.Types.ObjectId(user.id),
    semester: student.current_semester,
    academic_year,
  }).populate('slots.preferences.course_id', 'title course_code credits')

  return NextResponse.json(preference ?? null)
}