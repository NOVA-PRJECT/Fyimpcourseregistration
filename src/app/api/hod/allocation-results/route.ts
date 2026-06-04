import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/core/database/mongoose'
import { Allocation } from '@/core/database/models/Allocation'
import { verifyRole } from '@/core/security/auth'
import mongoose from 'mongoose'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { user, error } = await verifyRole(['hod'])
  if (error) return error

  const { searchParams } = new URL(request.url)
  const semester = searchParams.get('semester')
  const academic_year = searchParams.get('academic_year')

  if (!semester || !academic_year) {
    return NextResponse.json({ error: 'Semester and academic year required' }, { status: 400 })
  }

  await connectDB()

  const allocations = await Allocation.find({
    department_id: new mongoose.Types.ObjectId(user.department_id!),
    semester: Number(semester),
    academic_year,
  })
    .populate('slots.course_id', 'title course_code')
    .populate('student_id', 'full_name roll_number cap_application_number')

  let fullyAllocatedCount = 0
  let partiallyAllocatedCount = 0
  let unallocatedCount = 0

  allocations.forEach(allocation => {
    const unallocatedSlots = allocation.slots.filter(s => s.status === 'UNALLOCATED')
    if (unallocatedSlots.length === 0) {
      fullyAllocatedCount++
    } else if (unallocatedSlots.length === allocation.slots.length) {
      unallocatedCount++
    } else {
      partiallyAllocatedCount++
    }
  })

  return NextResponse.json({
    total_students: allocations.length,
    fully_allocated_count: fullyAllocatedCount,
    partially_allocated_count: partiallyAllocatedCount,
    unallocated_count: unallocatedCount,
    allocations,
  })
}
