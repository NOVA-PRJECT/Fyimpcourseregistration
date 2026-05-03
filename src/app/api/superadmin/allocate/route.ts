import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/core/database/mongoose'
import { Allocation } from '@/core/database/models/Allocation'
import { verifyRole } from '@/core/security/auth'
import { runAllocation, SemesterType } from '@/core/utils/allocationEngine'
import mongoose from 'mongoose'

export const dynamic = 'force-dynamic'

// POST — trigger university-wide allocation
export async function POST(request: NextRequest) {
  const { error } = await verifyRole(['superadmin'])
  if (error) return error

  const { academic_year, semester_type } = await request.json()

  if (!academic_year || !semester_type) {
    return NextResponse.json(
      { error: 'academic_year and semester_type (ODD or EVEN) are required' },
      { status: 400 }
    )
  }

  if (!['ODD', 'EVEN'].includes(semester_type)) {
    return NextResponse.json(
      { error: 'semester_type must be ODD or EVEN' },
      { status: 400 }
    )
  }

  await connectDB()

  // Guard — only one run per academic_year + semester_type
  const existing = await Allocation.findOne({ academic_year, semester_type }).lean()
  if (existing) {
    return NextResponse.json(
      { error: `Allocation already ran for ${academic_year} ${semester_type} semester. Cannot re-run.` },
      { status: 409 }
    )
  }

  const allocation_run_id = new mongoose.Types.ObjectId()

  try {
    const summary = await runAllocation({
      academic_year,
      semester_type: semester_type as SemesterType,
      allocation_run_id,
    })

    return NextResponse.json({
      success: true,
      message: `Allocation for ${academic_year} ${semester_type} semester completed`,
      ...summary,
    })
  } catch (err: any) {
    console.error('Allocation failed:', err)
    return NextResponse.json({ error: err.message ?? 'Allocation failed' }, { status: 500 })
  }
}

// GET — check allocation status
export async function GET(request: NextRequest) {
  const { error } = await verifyRole(['superadmin'])
  if (error) return error

  const { searchParams } = new URL(request.url)
  const academic_year = searchParams.get('academic_year')
  const semester_type = searchParams.get('semester_type')

  if (!academic_year || !semester_type) {
    return NextResponse.json(
      { error: 'academic_year and semester_type are required' },
      { status: 400 }
    )
  }

  await connectDB()

  const existing = await Allocation.findOne({ academic_year, semester_type }).lean()

  return NextResponse.json({
    has_run: !!existing,
    run_at: existing?.createdAt ?? null,
  })
}
