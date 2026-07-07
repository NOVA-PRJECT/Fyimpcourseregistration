import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/core/database/supabaseAdmin'
import { verifyHod } from '@/core/auth/verifyRole'

export const dynamic = 'force-dynamic'

export async function DELETE(request: NextRequest) {
  const auth = await verifyHod()
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { student_id } = await request.json()
  if (!student_id) {
    return NextResponse.json({ error: 'Student ID required' }, { status: 400 })
  }

  // Verify student belongs to HOD's department AND campus — never trust client IDs
  const { data: student } = await supabaseAdmin
    .from('students')
    .select('id, department_id, campus_id')
    .eq('id', student_id)
    .single()

  if (!student || student.department_id !== auth.department_id || student.campus_id !== auth.campus_id) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  }

  // 2. Delete the students row — cascade handles student_registrations automatically
  await supabaseAdmin.from('students').delete().eq('id', student_id)

  // 3. Delete the Supabase auth user
  await supabaseAdmin.auth.admin.deleteUser(student_id)

  // 4. Return success
  return NextResponse.json({ success: true, message: 'Student removed successfully' })
}
