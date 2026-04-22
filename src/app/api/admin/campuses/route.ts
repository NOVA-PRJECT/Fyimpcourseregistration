import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/core/database/mongoose'
import { Campus } from '@/core/database/models/Campus'
import { Department } from '@/core/database/models/Department'
import { User } from '@/core/database/models/User'
import { verifyRole } from '@/core/security/auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const CampusSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
})

export async function GET() {
  const { error } = await verifyRole(['superadmin'])
  if (error) return error

  await connectDB()
  const campuses = await Campus.find().sort({ name: 1 })
  return NextResponse.json(campuses)
}

export async function POST(request: NextRequest) {
  const { error } = await verifyRole(['superadmin'])
  if (error) return error

  await connectDB()
  const body = await request.json()
  const result = CampusSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    )
  }

  try {
    const campus = await Campus.create({
      name: result.data.name,
      code: result.data.code.toUpperCase(),
    })
    return NextResponse.json({ success: true, message: 'Campus created', campus })
  } catch (err: any) {
    if (err.code === 11000) {
      return NextResponse.json(
        { error: 'Campus name or code already exists' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: 'Failed to create campus' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const { error } = await verifyRole(['superadmin'])
  if (error) return error

  await connectDB()
  const { id, name, code } = await request.json()
  if (!id || !name || !code) {
    return NextResponse.json({ error: 'ID, name and code required' }, { status: 400 })
  }

  await Campus.findByIdAndUpdate(id, { name, code: code.toUpperCase() })
  return NextResponse.json({ success: true, message: 'Campus updated' })
}

export async function DELETE(request: NextRequest) {
  const { error } = await verifyRole(['superadmin'])
  if (error) return error

  await connectDB()
  const { campus_id } = await request.json()
  if (!campus_id) {
    return NextResponse.json({ error: 'Campus ID required' }, { status: 400 })
  }

  // Get all departments under this campus
  const departments = await Department.find({ campus_id })
  const deptIds = departments.map(d => d._id)

  // Delete all users in this campus
  const students = await User.find({ campus_id })
  await User.deleteMany({ campus_id })

  // Delete departments
  await Department.deleteMany({ campus_id })

  // Delete campus
  await Campus.findByIdAndDelete(campus_id)

  return NextResponse.json({ success: true, message: 'Campus deleted' })
}