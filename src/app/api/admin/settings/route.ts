import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/core/database/mongoose'
import { Settings } from '@/core/database/models/Settings'
import { verifyRole } from '@/core/security/auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const SettingsSchema = z.object({
  campus_id: z.string().min(1),
  semester: z.number().int().min(1).max(10),
  deadline: z.string().min(1, 'Deadline is required'),
  min_credits: z.number().int().positive().optional(),
  max_credits: z.number().int().positive().optional(),
})

function getCurrentAcademicYear(): string {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  if (month >= 6) return `${year}-${String(year + 1).slice(2)}`
  return `${year - 1}-${String(year).slice(2)}`
}

export async function GET(request: NextRequest) {
  const { user, error } = await verifyRole(['superadmin', 'student', 'hod', 'teaching_staff'])
  if (error) return error

  await connectDB()
  const { searchParams } = new URL(request.url)
  const campus_id = searchParams.get('campus_id')
  const semester = searchParams.get('semester')

  const query: any = {}
  if (campus_id) query.campus_id = campus_id
  if (semester) query.semester = Number(semester)

  const settings = await Settings.findOne(query)
  return NextResponse.json(settings)
}

export async function POST(request: NextRequest) {
  const { error } = await verifyRole(['superadmin'])
  if (error) return error

  await connectDB()
  const body = await request.json()
  const result = SettingsSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    )
  }

  const { campus_id, semester, deadline, min_credits, max_credits } = result.data
  const deadlineDate = new Date(deadline)

  if (isNaN(deadlineDate.getTime())) {
    return NextResponse.json({ error: 'Invalid deadline' }, { status: 400 })
  }

  const academic_year = getCurrentAcademicYear()

  await Settings.findOneAndUpdate(
    { campus_id, semester, academic_year },
    {
      campus_id,
      semester,
      academic_year,
      preference_deadline: deadlineDate,
      preference_window_open: true,
      allocation_status: 'OPEN',
      min_credits: min_credits ?? 18,
      max_credits: max_credits ?? 26,
    },
    { upsert: true, new: true }
  )

  return NextResponse.json({ success: true, message: 'Settings saved' })
}