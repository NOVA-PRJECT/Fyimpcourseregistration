import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/core/database/mongoose'
import { Blueprint } from '@/core/database/models/Blueprint'
import { verifyRole } from '@/core/security/auth'
import mongoose from 'mongoose'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { user, error } = await verifyRole(['hod'])
  if (error) return error

  const { searchParams } = new URL(request.url)
  const semester = searchParams.get('semester')
  if (!semester) {
    return NextResponse.json({ error: 'Semester required' }, { status: 400 })
  }

  await connectDB()

  const blueprint = await Blueprint.findOne({
    department_id: new mongoose.Types.ObjectId(user.department_id!),
    semester: Number(semester),
  })

  return NextResponse.json(blueprint ?? null)
}

export async function PUT(request: NextRequest) {
  const { user, error } = await verifyRole(['hod'])
  if (error) return error

  const body = await request.json()
  const { semester, min_credits, max_credits, slots } = body

  if (!semester || !slots) {
    return NextResponse.json(
      { error: 'Semester and slots are required' },
      { status: 400 }
    )
  }

  await connectDB()

  await Blueprint.findOneAndUpdate(
    {
      department_id: new mongoose.Types.ObjectId(user.department_id!),
      semester: Number(semester),
    },
    {
      department_id: user.department_id,
      semester: Number(semester),
      min_credits: min_credits ?? 18,
      max_credits: max_credits ?? 26,
      slots,
    },
    { upsert: true, new: true }
  )

  return NextResponse.json({ success: true, message: 'Blueprint saved successfully' })
}