import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/core/database/supabaseAdmin'
import { verifyHod } from '@/core/auth/verifyRole'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const UpdateStudentSchema = z.object({
  student_id: z.string().uuid('Invalid student ID'),
  full_name: z.string().min(1, 'Full name is required'),
  current_semester: z.number().int().min(1).max(10),
})

export async function PUT(request: NextRequest) {
  const auth = await verifyHod()
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
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

  if (!student || student.department_id !== auth.department_id) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  }

  const { error } = await supabaseAdmin
    .from('students')
    .update({
      full_name: result.data.full_name,
      current_semester: result.data.current_semester,
    })
    .eq('id', result.data.student_id)

  if (error) {
    console.error('hod/students/update PUT failed:', error)
    return NextResponse.json({ error: 'Failed to update student' }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'Student updated successfully' })
}
