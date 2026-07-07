import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/core/database/supabaseAdmin'
import { verifyHod } from '@/core/auth/verifyRole'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const AddStudentSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  roll_number: z.string().min(1, 'Roll number is required'),
  cap_application_number: z.string().min(1, 'CAP number is required'),
  academic_year_joined: z.string().min(1, 'Academic year joined is required'),
  current_semester: z.coerce
    .number({ message: 'Semester must be a number' })
    .int()
    .min(1)
    .max(10)
    .default(1),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export async function POST(request: NextRequest) {
  const auth = await verifyHod()
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const body = await request.json()
  const result = AddStudentSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    )
  }

  const { full_name, roll_number, cap_application_number, academic_year_joined, current_semester, email, password } = result.data

  // Duplicate check
  const [{ data: existingCap }, { data: existingRoll }] = await Promise.all([
    supabaseAdmin
      .from('students')
      .select('id')
      .eq('cap_application_number', cap_application_number)
      .maybeSingle(),
    supabaseAdmin
      .from('students')
      .select('id')
      .eq('roll_number', roll_number)
      .maybeSingle(),
  ])

  if (existingCap) {
    return NextResponse.json({ error: 'This CAP number already exists' }, { status: 409 })
  }
  if (existingRoll) {
    return NextResponse.json({ error: 'This roll number already exists' }, { status: 409 })
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
    roll_number,
    cap_application_number,
    academic_year_joined,
    current_semester,
    department_id: auth.department_id,
    campus_id: auth.campus_id,
    must_change_password: true,
  })

  if (studentError) {
    // Rollback: remove orphaned auth user
    await supabaseAdmin.auth.admin.deleteUser(authUserId)
    console.error('hod/students/add POST — student insert failed:', studentError)
    return NextResponse.json({ error: 'Failed to create student record' }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'Student created successfully' })
}
