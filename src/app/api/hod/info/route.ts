import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/core/database/mongoose'
import { Department } from '@/core/database/models/Department'
import { verifyRole } from '@/core/security/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { user, error } = await verifyRole(['hod'])
  if (error) return error

  await connectDB()

  if (!user.department_id) {
    return NextResponse.json({ error: 'No department assigned' }, { status: 400 })
  }

  const department = await Department.findById(user.department_id).select('name code')
  
  if (!department) {
    return NextResponse.json({ error: 'Department not found' }, { status: 404 })
  }

  return NextResponse.json({
    name: department.name,
    code: department.code,
  })
}
