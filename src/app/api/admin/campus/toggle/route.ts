import { NextRequest, NextResponse } from 'next/server'
import { CampusSettingsSchema } from '@/modules/admin/schemas/campusSettingsSchema'
import { toggleWindow } from '@/modules/admin/services/toggleWindow'
import { verifyDirector } from '@/core/auth/verifyRole'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {

  // Auth check — must be a campus_director
  const auth = await verifyDirector()
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const body = await request.json()
  const result = CampusSettingsSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: result.error.flatten() },
      { status: 400 }
    )
  }

  const response = await toggleWindow(result.data, auth.campus_id)

  if (!response.success) {
    return NextResponse.json(
      { error: response.error },
      { status: response.status }
    )
  }

  return NextResponse.json({
    success: true,
    message: response.message,
  })
}
