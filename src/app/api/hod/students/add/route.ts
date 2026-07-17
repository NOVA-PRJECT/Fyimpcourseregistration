import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/core/database/supabaseAdmin'
import { verifyHod, handleAuthError } from '@/core/auth/verifyRole'
import { z } from 'zod'
import { PasswordValidationSchema } from '@/core/validation/passwordSchema'
import { deleteAuthUser } from '@/core/auth/deleteAuthUser'
import { logServerError } from '@/core/logging/logger'
import { adminCrudLimiter } from '@/core/security/rateLimiter'
import { logAuditEvent, AuditEvents } from '@/core/logging/auditLogger'

export const dynamic = 'force-dynamic'

const AddStudentSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(100, 'Full name must not exceed 100 characters'),
  cap_application_number: z.string().min(1, 'CAP number is required'),
  academic_year_joined: z.string().min(1, 'Academic year joined is required'),
  current_semester: z.coerce
    .number({ message: 'Semester must be a number' })
    .int()
    .min(1)
    .max(10)
    .default(1),
  email: z.string().email('Invalid email address'),
  password: PasswordValidationSchema,
})

export async function POST(request: NextRequest) {
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

  const result = AddStudentSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    )
  }

  const { full_name, cap_application_number, academic_year_joined, current_semester, email, password } = result.data

  // Duplicate check
  const { data: existingCap } = await supabaseAdmin
    .from('students')
    .select('id')
    .eq('cap_application_number', cap_application_number)
    .maybeSingle()

  if (existingCap) {
    return NextResponse.json({ error: 'This CAP number already exists' }, { status: 409 })
  }

  // Create Supabase Auth user
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,


  })

  if (authError || !authData.user) {
    return NextResponse.json(
      { error: authError?.message ?? 'Failed to create auth account' },
      { status: 500 }
    )
  }

  const authUserId = authData.user.id

  // Insert students row — department_id and campus_id locked to HOD's own
  const { error: studentError } = await supabaseAdmin.from('students').insert({
    id: authUserId,
    full_name,
    cap_application_number,
    academic_year_joined,
    current_semester,
    department_id: auth.department_id,
    campus_id: auth.campus_id,
    must_change_password: true,
  })

  if (studentError) {
    // Rollback: remove orphaned auth user
    await deleteAuthUser(authUserId)
    logServerError('/api/hod/students/add', studentError, { userId: auth.userId, newStudentEmail: email })
    return NextResponse.json({ error: 'Failed to create student record' }, { status: 500 })
  }

  await logAuditEvent({
    eventType: AuditEvents.STUDENT_CREATED,
    userId: auth.userId,
    userRole: auth.role,
    action: `created student: ${cap_application_number}`,
    resourceType: 'student',
    resourceId: authUserId,
    status: 'success',
    metadata: {
      cap_application_number,
      department_id: auth.department_id,
      campus_id: auth.campus_id,
    }
  })

  return NextResponse.json({ success: true, message: 'Student created successfully' })
}
