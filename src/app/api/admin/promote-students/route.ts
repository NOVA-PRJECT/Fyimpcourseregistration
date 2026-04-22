import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/core/database/mongoose'
import { User } from '@/core/database/models/User'
import { verifyRole } from '@/core/security/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const { error } = await verifyRole(['superadmin'])
  if (error) return error

  await connectDB()
  const { campus_id } = await request.json()

  if (!campus_id) {
    return NextResponse.json({ error: 'Campus ID required' }, { status: 400 })
  }

  const result = await User.updateMany(
    {
      role: 'student',
      campus_id,
      current_semester: { $lt: 10 },
    },
    {
      $inc: { current_semester: 1 },
    }
  )

  return NextResponse.json({
    success: true,
    message: `${result.modifiedCount} students promoted to next semester`,
    promoted_count: result.modifiedCount,
  })
}