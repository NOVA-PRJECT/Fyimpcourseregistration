import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/core/database/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function DELETE(request: NextRequest) {
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
    .select('role, department_id')
    .eq('id', user.id)
    .single()

  if (!hod || hod.role !== 'hod') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { student_id } = await request.json()

  if (!student_id) {
    return NextResponse.json({ error: 'Student ID required' }, { status: 400 })
  }

  // Verify student belongs to HOD's department
  const { data: student } = await supabaseAdmin
    .from('students')
    .select('id, department_id')
    .eq('id', student_id)
    .single()

  if (!student || student.department_id !== hod.department_id) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  }

  // Delete student registrations first
  await supabaseAdmin
    .from('student_registrations')
    .delete()
    .eq('student_id', student_id)

  // Delete student record
  await supabaseAdmin
    .from('students')
    .delete()
    .eq('id', student_id)

  // Delete auth account
  await supabaseAdmin.auth.admin.deleteUser(student_id)

  return NextResponse.json({ success: true, message: 'Student removed successfully' })
}