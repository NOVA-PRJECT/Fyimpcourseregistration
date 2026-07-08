import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/core/database/supabaseClient'
import { verifyHod } from '@/core/auth/verifyRole'
import { logServerError } from '@/core/logging/logger'

export const dynamic = 'force-dynamic'

// GET — fetch students for HOD's dept + semester
export async function GET(request: NextRequest) {
  const auth = await verifyHod()
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { searchParams } = new URL(request.url)
  const semester = searchParams.get('semester')
  if (!semester) {
    return NextResponse.json({ error: 'Semester required' }, { status: 400 })
  }

  const supabase = await getSupabaseServerClient()
  const { data: students, error } = await supabase
    .from('students')
    .select('id, full_name, current_semester, cap_application_number')
    .eq('department_id', auth.department_id)
    .eq('campus_id', auth.campus_id)
    .eq('current_semester', Number(semester))
    .order('full_name')

  if (error) {
    logServerError('/api/hod/students', error, { userId: auth.userId, department_id: auth.department_id, semester })
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 })
  }

  return NextResponse.json(students ?? [])
}
