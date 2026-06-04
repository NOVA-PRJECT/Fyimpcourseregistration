import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/core/database/mongoose'
import { User } from '@/core/database/models/User'
import { Department } from '@/core/database/models/Department'
import { verifyRole } from '@/core/security/auth'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'

export const dynamic = 'force-dynamic'

// GET — list departments with their HODs, and list available faculty members
export async function GET() {
  const { error } = await verifyRole(['superadmin'])
  if (error) return error

  await connectDB()

  try {
    // 1. Fetch all departments
    const departments = await Department.find().sort({ name: 1 }).lean()

    // 2. Fetch all HODs
    const hods = await User.find({ role: 'hod', is_active: true }).lean()

    // 3. Map HODs to departments
    const departmentsWithHods = departments.map(dept => {
      const hod = hods.find(h => h.department_id?.toString() === dept._id.toString())
      return {
        _id: dept._id.toString(),
        name: dept.name,
        code: dept.code,
        campus_id: dept.campus_id.toString(),
        hod: hod ? {
          _id: hod._id.toString(),
          full_name: hod.full_name,
          email: hod.email,
        } : null
      }
    })

    // 4. Fetch all potential faculty members (teaching_staff + hods)
    const faculty = await User.find({
      role: { $in: ['teaching_staff', 'hod'] },
      is_active: true
    }).populate('department_id', 'name code').sort({ full_name: 1 }).lean()

    const formattedFaculty = faculty.map(f => ({
      _id: f._id.toString(),
      full_name: f.full_name,
      email: f.email,
      role: f.role,
      department_id: f.department_id ? (f.department_id as any)._id?.toString() : null,
      department_name: f.department_id ? (f.department_id as any).name : 'No Department',
    }))

    return NextResponse.json({
      departments: departmentsWithHods,
      faculty: formattedFaculty,
    })
  } catch (err: any) {
    console.error('superadmin/hod GET failed:', err)
    return NextResponse.json({ error: 'Failed to fetch HOD data' }, { status: 500 })
  }
}

// POST — assign HOD (either existing or new user)
export async function POST(request: NextRequest) {
  const { error } = await verifyRole(['superadmin'])
  if (error) return error

  const body = await request.json()
  const { department_id, assignment_type, user_id, full_name, email, password } = body

  if (!department_id || !assignment_type) {
    return NextResponse.json({ error: 'Department ID and assignment type are required' }, { status: 400 })
  }

  if (assignment_type !== 'existing' && assignment_type !== 'new') {
    return NextResponse.json({ error: 'Invalid assignment type' }, { status: 400 })
  }

  await connectDB()

  try {
    // 1. Verify department exists
    const dept = await Department.findById(department_id)
    if (!dept) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 })
    }

    let assignedUserId: string | null = null

    if (assignment_type === 'existing') {
      if (!user_id) {
        return NextResponse.json({ error: 'User ID is required for existing faculty assignment' }, { status: 400 })
      }
      const existingUser = await User.findById(user_id)
      if (!existingUser) {
        return NextResponse.json({ error: 'Faculty user not found' }, { status: 404 })
      }
      if (existingUser.role !== 'teaching_staff' && existingUser.role !== 'hod') {
        return NextResponse.json({ error: 'Only teaching staff or HODs can be assigned as HOD' }, { status: 400 })
      }
      assignedUserId = existingUser._id.toString()

      // Update the user to HOD and assign department
      existingUser.role = 'hod'
      existingUser.department_id = dept._id
      await existingUser.save()
    } else {
      // Create new user
      if (!full_name?.trim() || !email?.trim() || !password?.trim()) {
        return NextResponse.json({ error: 'Full name, email, and password are required' }, { status: 400 })
      }

      // Check if email already taken
      const existingUser = await User.findOne({ email: email.toLowerCase().trim() })
      if (existingUser) {
        return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 })
      }

      const hashedPassword = await bcrypt.hash(password.trim(), 12)
      const newUser = await User.create({
        full_name: full_name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: 'hod',
        department_id: dept._id,
        is_active: true,
      })
      assignedUserId = newUser._id.toString()
    }

    // 2. Demote any PREVIOUS HODs of this department (excluding the newly assigned one)
    if (assignedUserId) {
      await User.updateMany(
        {
          department_id: dept._id,
          role: 'hod',
          _id: { $ne: new mongoose.Types.ObjectId(assignedUserId) }
        },
        {
          $set: { role: 'teaching_staff' }
        }
      )
    }

    return NextResponse.json({ success: true, message: 'HOD assigned successfully' })
  } catch (err: any) {
    console.error('superadmin/hod POST failed:', err)
    return NextResponse.json({ error: 'Failed to assign HOD' }, { status: 500 })
  }
}
