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

// POST — assign HOD (simplify to always update/create a persistent HOD user for the department)
export async function POST(request: NextRequest) {
  const { error } = await verifyRole(['superadmin'])
  if (error) return error

  const body = await request.json()
  const { department_id, user_id, email, password } = body

  if (!department_id || !user_id || !email?.trim() || !password?.trim()) {
    return NextResponse.json({ error: 'Department, Teaching Staff selection, Email, and Password are all required' }, { status: 400 })
  }

  await connectDB()

  try {
    // 1. Verify department exists
    const dept = await Department.findById(department_id)
    if (!dept) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 })
    }

    // 2. Verify the selected teaching staff exists
    const teacher = await User.findById(user_id)
    if (!teacher) {
      return NextResponse.json({ error: 'Selected teaching staff not found' }, { status: 404 })
    }

    // 3. Find if there's already an HOD user for this department
    const existingHod = await User.findOne({ role: 'hod', department_id: dept._id })

    // 4. Check if the email is already taken by ANOTHER user
    const emailConflictQuery: any = { email: email.toLowerCase().trim() }
    if (existingHod) {
      emailConflictQuery._id = { $ne: existingHod._id }
    }
    const emailConflictUser = await User.findOne(emailConflictQuery)
    if (emailConflictUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(password.trim(), 12)

    if (existingHod) {
      // Update existing HOD user document
      existingHod.full_name = teacher.full_name
      existingHod.email = email.toLowerCase().trim()
      existingHod.password = hashedPassword
      await existingHod.save()
    } else {
      // Create new HOD user document
      await User.create({
        full_name: teacher.full_name,
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: 'hod',
        department_id: dept._id,
        is_active: true,
      })
    }

    return NextResponse.json({ success: true, message: 'HOD assigned successfully' })
  } catch (err: any) {
    console.error('superadmin/hod POST failed:', err)
    return NextResponse.json({ error: 'Failed to assign HOD' }, { status: 500 })
  }
}
