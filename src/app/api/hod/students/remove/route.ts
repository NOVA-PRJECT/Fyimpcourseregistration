import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/core/database/supabaseAdmin'
import { verifyHod } from '@/core/auth/verifyRole'
import { deleteAuthUser } from '@/core/auth/deleteAuthUser'
import { logServerError } from '@/core/logging/logger'

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

  // 4. Return success
  return NextResponse.json({ success: true, message: 'Student removed successfully' })
}
