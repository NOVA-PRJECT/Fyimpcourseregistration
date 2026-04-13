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

  // Verify student belongs to HOD's department
  const { data: student } = await supabaseAdmin
    .from('students')
    .select('id, department_id')
    .eq('id', student_id)
    .single()

  if (!student || student.department_id !== auth.department_id) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  }

  // M5 fix: Delete auth account first (irreversible step) — if this fails, DB is untouched
  const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(student_id)
  if (authDeleteError) {
    console.error('hod/students/remove — auth deletion failed:', authDeleteError)
    return NextResponse.json({ error: 'Failed to delete student account' }, { status: 500 })
  }

  // Then delete DB rows (recoverable if these fail)
  await supabaseAdmin.from('student_registrations').delete().eq('student_id', student_id)
  await supabaseAdmin.from('students').delete().eq('id', student_id)

  return NextResponse.json({ success: true, message: 'Student removed successfully' })
}
