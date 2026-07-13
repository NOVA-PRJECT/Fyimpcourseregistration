import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/core/database/supabaseAdmin'
import { verifyHod, handleAuthError } from '@/core/auth/verifyRole'
import { deleteAuthUser } from '@/core/auth/deleteAuthUser'
import { logServerError } from '@/core/logging/logger'
import { adminCrudLimiter } from '@/core/security/rateLimiter'
import { logAuditEvent, AuditEvents } from '@/core/logging/auditLogger'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const RemoveStudentSchema = z.object({
  student_id: z.string().uuid('Invalid student ID'),
})

export async function DELETE(request: NextRequest) {
  const auth = await verifyHod()
  if (!auth.success) return handleAuthError(auth)

  const { success: withinLimit } = await adminCrudLimiter.limit(auth.userId)
  if (!withinLimit) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const result = RemoveStudentSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
  }

  const { student_id } = result.data

  // Delete the student row — cascade handles student_registrations automatically
  const { data, error } = await supabaseAdmin
    .from('students')
    .delete()
    .eq('id', student_id)
    .eq('department_id', auth.department_id)
    .eq('campus_id', auth.campus_id)
    .select()

  if (error) {
    logServerError('/api/hod/students/remove', error, { userId: auth.userId, targetStudentId: student_id })
    return NextResponse.json({ error: 'Failed to delete student' }, { status: 500 })
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  }

  // 3. Delete the Supabase auth user
  await deleteAuthUser(student_id)

  await logAuditEvent({
    eventType: AuditEvents.STUDENT_DELETED,
    userId: auth.userId,
    userRole: auth.role,
    action: `deleted student: ${student_id}`,
    resourceType: 'student',
    resourceId: student_id,
    status: 'success',
  })

  // 4. Return success
  return NextResponse.json({ success: true, message: 'Student removed successfully' })
}
