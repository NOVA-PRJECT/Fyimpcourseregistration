import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/core/database/supabaseClient'
import { supabaseAdmin } from '@/core/database/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await getSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const role = user.app_metadata?.role

  if (role === 'student') {
    const { data: student } = await supabaseAdmin
      .from('students')
      .select('full_name, current_semester, department_id, campus_id, departments(name), campuses(name)')
      .eq('id', user.id)
      .single()
    return NextResponse.json({ role, profile: student })
  }

  if (role === 'hod' || role === 'campus_director' || role === 'teaching_staff') {
    const { data: faculty } = await supabaseAdmin
      .from('faculty')
      .select('full_name, campus_id, department_id, departments(name), campuses(name)')
      .eq('id', user.id)
      .single()
    return NextResponse.json({ role, profile: faculty })
  }

  if (role === 'superadmin') {
    const { data: admin } = await supabaseAdmin
      .from('admins')
      .select('full_name')
      .eq('id', user.id)
      .single()
    return NextResponse.json({ role, profile: admin })
  }

  return NextResponse.json({ error: 'Role not found or invalid' }, { status: 403 })
}
