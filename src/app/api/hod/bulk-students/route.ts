import { NextRequest, NextResponse } from 'next/server'
import { bulkCreateStudents } from '@/modules/hod/services/bulkCreateStudents'
import { verifyHod } from '@/core/auth/verifyRole'
import { bulkUploadLimiter } from '@/core/security/rateLimiter'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const BulkStudentsBodySchema = z.object({
  rows: z.array(z.unknown()).min(1, 'At least one row is required'),
  batch_default_password: z
    .string()
    .min(8, 'Batch password must be at least 8 characters'),
})

export async function POST(request: NextRequest) {

  // Auth — HOD only
  const auth = await verifyHod()
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  // Rate limit by HOD user ID
  const { success: withinLimit } = await bulkUploadLimiter.limit(auth.userId)
  if (!withinLimit) {
    return NextResponse.json(
      { error: 'Too many upload attempts. Please wait before trying again.' },
      { status: 429 }
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = BulkStudentsBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const { rows, batch_default_password } = parsed.data

  const response = await bulkCreateStudents(
    rows,
    auth.department_id,
    auth.campus_id,
    batch_default_password
  )

  if (!response.success) {
    return NextResponse.json(
      { error: response.error },
      { status: response.status ?? 500 }
    )
  }

  const results = response.results ?? []
  const successRows = results.filter(r => r.status === 'success')
  const errorRows = results.filter(r => r.status === 'error')

  return NextResponse.json({
    success: true,
    inserted_count: successRows.length,
    error_count: errorRows.length,
    results,
  })
}
