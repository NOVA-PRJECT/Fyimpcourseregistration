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

  // Delete auth account first — if this fails, DB is untouched
  const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(student_id)
  if (authDeleteError) {
    console.error('hod/students/remove — auth deletion failed:', authDeleteError)
    return NextResponse.json({ error: 'Failed to delete student account' }, { status: 500 })
  }

  // Cascade delete dependent rows before deleting the student row
  await supabaseAdmin.from('attendance').delete().eq('student_id', student_id)
  await supabaseAdmin.from('marks').delete().eq('student_id', student_id)
  await supabaseAdmin.from('student_registrations').delete().eq('student_id', student_id)
  await supabaseAdmin.from('students').delete().eq('id', student_id)

  return NextResponse.json({ success: true, message: 'Student removed successfully' })
}
