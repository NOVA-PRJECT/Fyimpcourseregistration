import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/core/database/supabaseAdmin'
import { verifyHod, handleAuthError } from '@/core/auth/verifyRole'
import { z } from 'zod'
import { logServerError } from '@/core/logging/logger'
import { adminCrudLimiter } from '@/core/security/rateLimiter'

export const dynamic = 'force-dynamic'

const UpdateStudentSchema = z.object({
  student_id: z.string().uuid('Invalid student ID'),
  full_name: z.string().min(1, 'Full name is required'),
  current_semester: z.number().int().min(1).max(10),
})

export async function PUT(request: NextRequest) {
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

  const result = UpdateStudentSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    )
  }

  const { data, error } = await supabaseAdmin
    .from('students')
    .update({
      full_name: result.data.full_name,
      current_semester: result.data.current_semester,
    })
    .eq('id', result.data.student_id)
    .eq('department_id', auth.department_id)
    .eq('campus_id', auth.campus_id)
    .select()

  if (error) {
    logServerError('/api/hod/students/update', error, { userId: auth.userId, targetStudentId: result.data.student_id })
    return NextResponse.json({ error: 'Failed to update student' }, { status: 500 })
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, message: 'Student updated successfully' })
}
