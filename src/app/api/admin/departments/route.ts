import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/core/database/mongoose'
import { Department } from '@/core/database/models/Department'
import { User } from '@/core/database/models/User'
import { verifyRole } from '@/core/security/auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const DeptSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  campus_id: z.string().min(1, 'Campus is required'),
})

export async function GET() {
  const { error } = await verifyRole(['superadmin'])
  if (error) return error

  await connectDB()
  const departments = await Department.find()
    .populate('campus_id', 'name code')
    .sort({ name: 1 })
  return NextResponse.json(departments)
}

export async function POST(request: NextRequest) {
  const { error } = await verifyRole(['superadmin'])
  if (error) return error

  await connectDB()
  const body = await request.json()
  const result = DeptSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    )
  }

  try {
    const dept = await Department.create({
      name: result.data.name,
      code: result.data.code.toUpperCase(),
      campus_id: result.data.campus_id,
    })
    return NextResponse.json({ success: true, message: 'Department created', dept })
  } catch (err: any) {
    if (err.code === 11000) {
      return NextResponse.json(
        { error: 'Department name or code already exists' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: 'Failed to create department' }, { status: 500 })
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

  await Department.findByIdAndUpdate(id, { name, code: code.toUpperCase() })
  return NextResponse.json({ success: true, message: 'Department updated' })
}

export async function DELETE(request: NextRequest) {
  const { error } = await verifyRole(['superadmin'])
  if (error) return error

  await connectDB()
  const { department_id } = await request.json()
  if (!department_id) {
    return NextResponse.json({ error: 'Department ID required' }, { status: 400 })
  }

  await User.deleteMany({ department_id })
  await Department.findByIdAndDelete(department_id)

  return NextResponse.json({ success: true, message: 'Department deleted' })
}