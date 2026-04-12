import { NextRequest, NextResponse } from 'next/server'
import { CampusSettingsSchema } from '@/modules/admin/schemas/campusSettingsSchema'
import { updateSettings } from '@/modules/admin/services/updateSettings'
import { verifyDirector } from '@/core/auth/verifyRole'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  
  const auth = await verifyDirector()
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }
  
  
  
  const body = await request.json()
  const result = CampusSettingsSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    )
  }

  const response = await updateSettings(result.data)

  if (!response.success) {
    return NextResponse.json(
      { error: response.error },
      { status: response.status }
    )
  }

  return NextResponse.json({ success: true, message: response.message })
}