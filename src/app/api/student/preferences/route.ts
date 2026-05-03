import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/core/database/mongoose'
import { Preference } from '@/core/database/models/Preference'
import { User } from '@/core/database/models/User'
import { Course } from '@/core/database/models/Course'
import { Blueprint } from '@/core/database/models/Blueprint'
import { verifyRole } from '@/core/security/auth'
import mongoose from 'mongoose'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const ChoiceSchema = z.object({
  rank: z.number().int().min(1),
  course_id: z.string().min(1),
})

const SlotSchema = z.object({
  slot: z.number().int().min(1).max(6),
  choices: z.array(ChoiceSchema).min(1, 'At least one choice required per slot'),
})

const PreferenceSubmitSchema = z.object({
  slots: z.array(SlotSchema).min(1, 'At least one slot required'),
})

export async function POST(request: NextRequest) {
  const { user, error } = await verifyRole(['student'])
  if (error) return error

  const body = await request.json()
  const parsed = PreferenceSubmitSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  await connectDB()

  // Get student details
  const student = await User.findById(user.id).select(
    'department_id campus_id current_semester'
  )
  if (!student) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  }

  // Get blueprint to verify slots are elective
  const blueprint = await Blueprint.findOne({
    department_id: student.department_id,
    semester: student.current_semester,
  })
  if (!blueprint) {
    return NextResponse.json(
      { error: 'No blueprint found for your semester' },
      { status: 404 }
    )
  }

  // Verify only elective slots are submitted
  const electiveSlotNumbers = blueprint.slots
    .filter(s => s.rule !== 'FIXED')
    .map(s => s.slot)

  for (const slot of parsed.data.slots) {
    if (!electiveSlotNumbers.includes(slot.slot)) {
      return NextResponse.json(
        { error: `Slot ${slot.slot} is a fixed slot and cannot have preferences` },
        { status: 400 }
      )
    }
  }

  // Verify all submitted course IDs exist
  const allCourseIds = parsed.data.slots.flatMap(s =>
    s.choices.map(c => c.course_id)
  )
  const uniqueCourseIds = [...new Set(allCourseIds)]

  const courses = await Course.find({
    _id: { $in: uniqueCourseIds.map(id => new mongoose.Types.ObjectId(id)) },
  }).select('_id')

  if (courses.length !== uniqueCourseIds.length) {
    return NextResponse.json(
      { error: 'One or more course IDs are invalid' },
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

  // Upsert preference — student can update until window closes
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
  }).populate('slots.choices.course_id', 'title course_code credits')

  return NextResponse.json(preference ?? null)
}