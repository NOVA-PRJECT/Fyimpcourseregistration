import { NextRequest, NextResponse } from 'next/server'
import { CampusSettingsSchema } from '@/modules/admin/schemas/campusSettingsSchema'
import { toggleWindow } from '@/modules/admin/services/toggleWindow'

export async function POST(request: NextRequest) {

  const body = await request.json()
  const result = CampusSettingsSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: result.error.flatten() },
      { status: 400 }
    )
  }

  const response = await toggleWindow(result.data)

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