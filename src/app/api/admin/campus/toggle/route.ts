import { NextRequest, NextResponse } from 'next/server'
import { CampusSettingsSchema } from '@/modules/admin/schemas/campusSettingsSchema'
import { updateSettings } from '@/modules/admin/services/updateSettings'
import { verifyDirector, handleAuthError } from '@/core/auth/verifyRole'
import { adminCrudLimiter } from '@/core/security/rateLimiter'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const auth = await verifyDirector()
  if (!auth.success) return handleAuthError(auth)

  const { success: withinLimit } = await adminCrudLimiter.limit(auth.userId)
  if (!withinLimit) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }
  
  const body = await request.json()
  const result = CampusSettingsSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    )
  }

  const response = await updateSettings(auth, result.data)

  if (!response.success) {
    return NextResponse.json(
      { error: response.error },
      { status: response.status }
    )
  }

  return NextResponse.json({ success: true, message: response.message })
}