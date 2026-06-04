import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/core/database/mongoose'
import { Allocation } from '@/core/database/models/Allocation'
import { User } from '@/core/database/models/User'
import { verifyRole } from '@/core/security/auth'
import mongoose from 'mongoose'

export const dynamic = 'force-dynamic'

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

  const allocation = await Allocation.findOne({
    student_id: new mongoose.Types.ObjectId(user.id),
    semester: student.current_semester,
    academic_year,
  }).populate('slots.course_id', 'title course_code credits category')

  if (!allocation) {
    return NextResponse.json({
      status: 'PENDING',
      message: 'Allocation has not run yet for your semester',
      allocation: null,
    })
  }

  const unallocated = allocation.slots.filter(
    s => s.status === 'UNALLOCATED'
  )

  const fullyAllocated = unallocated.length === 0

  return NextResponse.json({
    status: fullyAllocated ? 'COMPLETE' : 'PARTIAL',
    semester: allocation.semester,
    academic_year: allocation.academic_year,
    total_credits: allocation.total_credits,
    fully_allocated: fullyAllocated,
    unallocated_count: unallocated.length,
    slots: allocation.slots,
  })
}