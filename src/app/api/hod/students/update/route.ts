import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/core/database/supabaseAdmin'
import { z } from 'zod'

const UpdateStudentSchema = z.object({
  student_id: z.string().uuid('Invalid student ID'),
  full_name: z.string().min(1, 'Full name is required'),
  current_semester: z.number().int().min(1).max(10),
})

export const dynamic = 'force-dynamic'

export async function PUT(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: hod } = await supabase
    .from('faculty')
    .select('role, department_id, campus_id')
    .eq('id', user.id)
    .single()

  if (!hod || hod.role !== 'hod') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await request.json()
  const result = UpdateStudentSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    )
  }

  // Verify student belongs to HOD's department
  const { data: student } = await supabaseAdmin
    .from('students')
    .select('id, department_id')
    .eq('id', result.data.student_id)
    .single()

  if (!student || student.department_id !== hod.department_id) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  }

  const { error: updateError } = await supabaseAdmin
    .from('students')
    .update({
      full_name: result.data.full_name,
      current_semester: result.data.current_semester,
    })
    .eq('id', result.data.student_id)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update student' }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'Student updated successfully' })
}