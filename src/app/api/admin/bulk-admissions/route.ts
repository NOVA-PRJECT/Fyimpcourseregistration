import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/core/database/mongoose'
import { User } from '@/core/database/models/User'
import { verifyRole } from '@/core/security/auth'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const { user, error } = await verifyRole(['hod'])
  if (error) return error

  const rows = await request.json()
  if (!Array.isArray(rows)) {
    return NextResponse.json({ error: 'Expected an array of rows' }, { status: 400 })
  }

  await connectDB()

  let insertedCount = 0
  let errorCount = 0
  const errors: { row: number; issues: string[] }[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNumber = i + 1
    const { cap_application_number, date_of_birth, full_name, email } = row

    const issues: string[] = []
    if (!cap_application_number) issues.push('Missing CAP number')
    if (!date_of_birth) issues.push('Missing date of birth')
    if (!full_name) issues.push('Missing full name')

    if (issues.length > 0) {
      errors.push({ row: rowNumber, issues })
      errorCount++
      continue
    }

    try {
      const existingStudent = await User.findOne({ cap_application_number })
      if (existingStudent) {
        issues.push(`CAP number ${cap_application_number} already exists`)
        errors.push({ row: rowNumber, issues })
        errorCount++
        continue
      }

      const hashedPassword = await bcrypt.hash(date_of_birth, 12)
      const dummyEmail = email || `${cap_application_number.toLowerCase()}@student.kannuruniversity.ac.in`

      await User.create({
        full_name,
        email: dummyEmail.toLowerCase().trim(),
        password: hashedPassword,
        role: 'student',
        department_id: user.department_id,
        current_semester: 1,
        cap_application_number,
        is_active: true,
      })
      insertedCount++
    } catch (err: any) {
      issues.push(err.message || 'Database error')
      errors.push({ row: rowNumber, issues })
      errorCount++
    }
  }

  return NextResponse.json({
    inserted_count: insertedCount,
    error_count: errorCount,
    errors: errors.length > 0 ? errors : undefined,
  })
}
