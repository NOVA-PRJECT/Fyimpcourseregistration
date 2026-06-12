import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/core/database/mongoose'
import { Program } from '@/core/database/models/Program'
import { Course } from '@/core/database/models/Course'
import { verifyRole } from '@/core/security/auth'
import mongoose from 'mongoose'

export const dynamic = 'force-dynamic'

// GET — list all programs for the HOD's department
export async function GET() {
  const { user, error } = await verifyRole(['hod'])
  if (error) return error

  if (!user.department_id) {
    return NextResponse.json({ error: 'HOD has no associated department' }, { status: 400 })
  }

  await connectDB()

  try {
    const programs = await Program.find({
      department_id: new mongoose.Types.ObjectId(user.department_id)
    }).sort({ name: 1 }).lean()

    return NextResponse.json(programs)
  } catch (err: any) {
    console.error('hod/programs GET failed:', err)
    return NextResponse.json({ error: 'Failed to fetch programs' }, { status: 500 })
  }
}

// POST — create program
export async function POST(request: NextRequest) {
  const { user, error } = await verifyRole(['hod'])
  if (error) return error

  if (!user.department_id) {
    return NextResponse.json({ error: 'HOD has no associated department' }, { status: 400 })
  }

  const { name, code, semesters, papers_per_semester, eligibility } = await request.json()

  if (!name?.trim() || !code?.trim() || !semesters || !eligibility?.trim()) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
  }

  const semNum = Number(semesters)
  if (isNaN(semNum) || semNum < 1 || semNum > 12) {
    return NextResponse.json({ error: 'Semesters must be a number between 1 and 12' }, { status: 400 })
  }

  const papersNum = Number(papers_per_semester || 4)
  if (isNaN(papersNum) || papersNum < 1 || papersNum > 10) {
    return NextResponse.json({ error: 'Papers per semester must be a number between 1 and 10' }, { status: 400 })
  }

  await connectDB()

  try {
    // Check if code is already used
    const existing = await Program.findOne({ code: code.trim().toUpperCase() })
    if (existing) {
      return NextResponse.json({ error: 'Program with this code already exists' }, { status: 409 })
    }

    const program = await Program.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      department_id: new mongoose.Types.ObjectId(user.department_id),
      semesters: semNum,
      papers_per_semester: papersNum,
      eligibility: eligibility.trim(),
    })

    return NextResponse.json({ success: true, message: 'Program created successfully', program })
  } catch (err: any) {
    console.error('hod/programs POST failed:', err)
    return NextResponse.json({ error: 'Failed to create program' }, { status: 500 })
  }
}

// PUT — update program
export async function PUT(request: NextRequest) {
  const { user, error } = await verifyRole(['hod'])
  if (error) return error

  if (!user.department_id) {
    return NextResponse.json({ error: 'HOD has no associated department' }, { status: 400 })
  }

  const { id, name, semesters, papers_per_semester, eligibility } = await request.json()

  if (!id || !name?.trim() || !semesters || !eligibility?.trim()) {
    return NextResponse.json({ error: 'ID and all fields are required' }, { status: 400 })
  }

  const semNum = Number(semesters)
  if (isNaN(semNum) || semNum < 1 || semNum > 12) {
    return NextResponse.json({ error: 'Semesters must be a number between 1 and 12' }, { status: 400 })
  }

  const papersNum = Number(papers_per_semester || 4)
  if (isNaN(papersNum) || papersNum < 1 || papersNum > 10) {
    return NextResponse.json({ error: 'Papers per semester must be a number between 1 and 10' }, { status: 400 })
  }

  await connectDB()

  try {
    const program = await Program.findById(id)
    if (!program || program.department_id.toString() !== user.department_id) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 })
    }

    program.name = name.trim()
    program.semesters = semNum
    program.papers_per_semester = papersNum
    program.eligibility = eligibility.trim()
    await program.save()

    return NextResponse.json({ success: true, message: 'Program updated successfully', program })
  } catch (err: any) {
    console.error('hod/programs PUT failed:', err)
    return NextResponse.json({ error: 'Failed to update program' }, { status: 500 })
  }
}

// DELETE — delete program
export async function DELETE(request: NextRequest) {
  const { user, error } = await verifyRole(['hod'])
  if (error) return error

  if (!user.department_id) {
    return NextResponse.json({ error: 'HOD has no associated department' }, { status: 400 })
  }

  const { id } = await request.json()
  if (!id) {
    return NextResponse.json({ error: 'Program ID is required' }, { status: 400 })
  }

  await connectDB()

  try {
    const program = await Program.findById(id)
    if (!program || program.department_id.toString() !== user.department_id) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 })
    }

    // Check if courses are linked to this program
    const coursesCount = await Course.countDocuments({ program_id: new mongoose.Types.ObjectId(id) })
    if (coursesCount > 0) {
      return NextResponse.json({
        error: `Cannot delete program — it has ${coursesCount} courses linked to it. Delete or reassign those courses first.`
      }, { status: 409 })
    }

    await Program.findByIdAndDelete(id)

    return NextResponse.json({ success: true, message: 'Program deleted successfully' })
  } catch (err: any) {
    console.error('hod/programs DELETE failed:', err)
    return NextResponse.json({ error: 'Failed to delete program' }, { status: 500 })
  }
}
