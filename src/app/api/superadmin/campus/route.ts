import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/core/database/mongoose'
import { Campus } from '@/core/database/models/Campus'
import { Department } from '@/core/database/models/Department'
import { verifyRole } from '@/core/security/auth'

export const dynamic = 'force-dynamic'

// GET — list all campuses
export async function GET() {
  const { error } = await verifyRole(['superadmin'])
  if (error) return error

  await connectDB()

  const campuses = await Campus.find().sort({ name: 1 }).lean()

  return NextResponse.json(
    campuses.map(c => ({
      _id: c._id.toString(),
      name: c.name,
      code: c.code,
      createdAt: c.createdAt,
    }))
  )
}

// POST — create campus
export async function POST(request: NextRequest) {
  const { error } = await verifyRole(['superadmin'])
  if (error) return error

  const { name, code } = await request.json()

  if (!name?.trim() || !code?.trim()) {
    return NextResponse.json(
      { error: 'Name and code are required' },
      { status: 400 }
    )
  }

  await connectDB()

  try {
    const campus = await Campus.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
    })

    return NextResponse.json(
      { success: true, message: 'Campus created successfully', _id: campus._id.toString() },
      { status: 201 }
    )
  } catch (err: any) {
    if (err.code === 11000) {
      const field = err.keyPattern?.code ? 'code' : 'name'
      return NextResponse.json(
        { error: `Campus with this ${field} already exists` },
        { status: 409 }
      )
    }
    console.error('campus POST failed:', err)
    return NextResponse.json({ error: 'Failed to create campus' }, { status: 500 })
  }
}

// PUT — update campus
export async function PUT(request: NextRequest) {
  const { error } = await verifyRole(['superadmin'])
  if (error) return error

  const { id, name, code } = await request.json()

  if (!id || !name?.trim() || !code?.trim()) {
    return NextResponse.json(
      { error: 'ID, name and code are required' },
      { status: 400 }
    )
  }

  await connectDB()

  try {
    const campus = await Campus.findByIdAndUpdate(
      id,
      { name: name.trim(), code: code.trim().toUpperCase() },
      { new: true, runValidators: true }
    )

    if (!campus) {
      return NextResponse.json({ error: 'Campus not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: 'Campus updated successfully' })
  } catch (err: any) {
    if (err.code === 11000) {
      const field = err.keyPattern?.code ? 'code' : 'name'
      return NextResponse.json(
        { error: `Campus with this ${field} already exists` },
        { status: 409 }
      )
    }
    console.error('campus PUT failed:', err)
    return NextResponse.json({ error: 'Failed to update campus' }, { status: 500 })
  }
}

// DELETE — delete campus
export async function DELETE(request: NextRequest) {
  const { error } = await verifyRole(['superadmin'])
  if (error) return error

  const { id } = await request.json()

  if (!id) {
    return NextResponse.json({ error: 'Campus ID required' }, { status: 400 })
  }

  await connectDB()

  // Check if campus has departments
  const deptCount = await Department.countDocuments({ campus_id: id })
  if (deptCount > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete — this campus has ${deptCount} department${deptCount > 1 ? 's' : ''} linked to it. Remove them first.`,
      },
      { status: 409 }
    )
  }

  const campus = await Campus.findByIdAndDelete(id)
  if (!campus) {
    return NextResponse.json({ error: 'Campus not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, message: 'Campus deleted successfully' })
}
