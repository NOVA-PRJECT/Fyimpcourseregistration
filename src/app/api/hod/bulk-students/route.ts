import { NextRequest, NextResponse } from 'next/server'
import { bulkCreateStudents } from '@/modules/hod/services/bulkCreateStudents'
import { verifyHod, handleAuthError } from '@/core/auth/verifyRole'
import { bulkUploadLimiter } from '@/core/security/rateLimiter'
import { z } from 'zod'
import { PasswordValidationSchema } from '@/core/validation/passwordSchema'
import { logAuditEvent, AuditEvents } from '@/core/logging/auditLogger'

export const dynamic = 'force-dynamic'

const BulkStudentsBodySchema = z.object({
  rows: z.array(z.unknown()).min(1, 'At least one row is required').max(120, 'Maximum 120 students per upload'),
  batch_default_password: PasswordValidationSchema,
})

export async function POST(request: NextRequest) {

  // Auth — HOD only
  const auth = await verifyHod()
  if (!auth.success) return handleAuthError(auth)

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

  await logAuditEvent({
    eventType: AuditEvents.STUDENT_BULK_CREATED,
    userId: auth.userId,
    userRole: auth.role,
    action: `bulk created students for department ${auth.department_id}`,
    resourceType: 'department',
    resourceId: auth.department_id,
    status: 'success',
    metadata: {
      inserted_count: successRows.length,
      error_count: errorRows.length,
    }
  })

  return NextResponse.json({
    success: true,
    inserted_count: successRows.length,
    error_count: errorRows.length,
    results,
  })
}
