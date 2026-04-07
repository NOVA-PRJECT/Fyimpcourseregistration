import { NextRequest, NextResponse } from 'next/server'
import { AddFacultySchema } from '@/modules/admin/schemas/addFacultySchema'
import { createFacultyUser } from '@/modules/admin/services/createFacultyUser'
import { verifyDirector } from '@/core/auth/verifyRole'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const auth = await verifyDirector()
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const body = await request.json()
  const result = AddFacultySchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: result.error.flatten() },
      { status: 400 }
    )
  }

  const response = await createFacultyUser({
    ...result.data,
    campus_id: auth.campus_id,
  })

  if (!response.success) {
    return NextResponse.json({ error: response.error }, { status: response.status })
  }

  return NextResponse.json({ success: true, message: response.message })
}
