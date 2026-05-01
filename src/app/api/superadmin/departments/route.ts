import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/core/database/mongoose'
import { Department } from '@/core/database/models/Department'
import { Campus } from '@/core/database/models/Campus'
import { verifyRole } from '@/core/security/auth'
import mongoose from 'mongoose'

export const dynamic = 'force-dynamic'

// GET — list departments, optionally filtered by campus_id
export async function GET(request: NextRequest) {
  const { error } = await verifyRole(['superadmin'])
  if (error) return error

  const { searchParams } = new URL(request.url)
  const campusId = searchParams.get('campus_id')

  await connectDB()

  const filter = campusId ? { campus_id: new mongoose.Types.ObjectId(campusId) } : {}

  const departments = await Department.find(filter)
    .populate('campus_id', 'name code')
    .sort({ name: 1 })
    .lean()

  return NextResponse.json(
    departments.map(d => ({
      _id: d._id.toString(),
      name: d.name,
      code: d.code,
      campus_id: (d.campus_id as any)?._id?.toString() ?? d.campus_id?.toString(),
      campus_name: (d.campus_id as any)?.name ?? null,
      createdAt: d.createdAt,
    }))
  )
}

// POST — create department
export async function POST(request: NextRequest) {
  const { error } = await verifyRole(['superadmin'])
  if (error) return error

  const { name, code, campus_id } = await request.json()

  if (!name?.trim() || !code?.trim() || !campus_id) {
    return NextResponse.json(
      { error: 'Name, code and campus are required' },
      { status: 400 }
    )
  }

  await connectDB()

  // Verify campus exists
  const campus = await Campus.findById(campus_id)
  if (!campus) {
    return NextResponse.json({ error: 'Campus not found' }, { status: 404 })
  }

  try {
    const dept = await Department.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      campus_id: new mongoose.Types.ObjectId(campus_id),
    })

    return NextResponse.json(
      { success: true, message: 'Department created successfully', _id: dept._id.toString() },
      { status: 201 }
    )
  } catch (err: any) {
    if (err.code === 11000) {
      const field = err.keyPattern?.code ? 'code' : 'name'
      return NextResponse.json(
        { error: `Department with this ${field} already exists` },
        { status: 409 }
      )
    }
    console.error('department POST failed:', err)
    return NextResponse.json({ error: 'Failed to create department' }, { status: 500 })
  }
}

// PUT — update department
export async function PUT(request: NextRequest) {
  const { error } = await verifyRole(['superadmin'])
  if (error) return error

  const { id, name, code, campus_id } = await request.json()

  if (!id || !name?.trim() || !code?.trim() || !campus_id) {
    return NextResponse.json(
      { error: 'ID, name, code and campus are required' },
      { status: 400 }
    )
  }

  await connectDB()

  // Verify campus exists
  const campus = await Campus.findById(campus_id)
  if (!campus) {
    return NextResponse.json({ error: 'Campus not found' }, { status: 404 })
  }

  try {
    const dept = await Department.findByIdAndUpdate(
      id,
      {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        campus_id: new mongoose.Types.ObjectId(campus_id),
      },
      { new: true, runValidators: true }
    )

    if (!dept) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: 'Department updated successfully' })
  } catch (err: any) {
    if (err.code === 11000) {
      const field = err.keyPattern?.code ? 'code' : 'name'
      return NextResponse.json(
        { error: `Department with this ${field} already exists` },
        { status: 409 }
      )
    }
    console.error('department PUT failed:', err)
    return NextResponse.json({ error: 'Failed to update department' }, { status: 500 })
  }
}

// DELETE — delete department
export async function DELETE(request: NextRequest) {
  const { error } = await verifyRole(['superadmin'])
  if (error) return error

  const { id } = await request.json()

  if (!id) {
    return NextResponse.json({ error: 'Department ID required' }, { status: 400 })
  }

  await connectDB()

  const dept = await Department.findByIdAndDelete(id)
  if (!dept) {
    return NextResponse.json({ error: 'Department not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, message: 'Department deleted successfully' })
}
