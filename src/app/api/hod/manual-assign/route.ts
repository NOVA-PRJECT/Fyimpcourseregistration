import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/core/database/mongoose'
import { Allocation } from '@/core/database/models/Allocation'
import { Course } from '@/core/database/models/Course'
import { verifyRole } from '@/core/security/auth'
import mongoose from 'mongoose'

export const dynamic = 'force-dynamic'

export async function PUT(request: NextRequest) {
  const { user, error } = await verifyRole(['hod'])
  if (error) return error

  const body = await request.json()
  const { allocation_id, slot_number, course_id, hod_note } = body

  if (!allocation_id || slot_number === undefined || !course_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  await connectDB()

  const allocation = await Allocation.findById(allocation_id)
  if (!allocation || allocation.department_id.toString() !== user.department_id) {
    return NextResponse.json({ error: 'Allocation not found' }, { status: 404 })
  }

  const slotIndex = allocation.slots.findIndex(s => s.slot === Number(slot_number))
  if (slotIndex === -1) {
    return NextResponse.json({ error: 'Slot not found' }, { status: 404 })
  }

  const course = await Course.findById(course_id)
  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  try {
    allocation.slots[slotIndex].status = 'MANUALLY_ALLOCATED'
    allocation.slots[slotIndex].course_id = new mongoose.Types.ObjectId(course_id)
    allocation.slots[slotIndex].allocated_by = 'HOD'
    if (hod_note) {
      allocation.slots[slotIndex].hod_note = hod_note
    }

    // Recalculate total_credits
    let total_credits = 0
    for (const slot of allocation.slots) {
      if (slot.course_id && slot.status !== 'UNALLOCATED') {
        const c = await Course.findById(slot.course_id).select('credits')
        if (c) total_credits += c.credits
      }
    }
    allocation.total_credits = total_credits

    await allocation.save()
    return NextResponse.json({ success: true, message: 'Slot manually assigned successfully' })
  } catch (err) {
    console.error('hod/manual-assign PUT failed:', err)
    return NextResponse.json({ error: 'Failed to assign slot' }, { status: 500 })
  }
}
