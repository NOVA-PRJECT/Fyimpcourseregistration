import { supabaseAdmin } from '@/core/database/supabaseAdmin'
import { ROLE_DASHBOARD_MAP } from '@/core/security/routeConfig'
import { Role } from '@/core/constants/roles'

export async function determineUserRoute(authUserId: string): Promise<{
  role: Role | null
  redirectTo: string | null
  department_id?: string | null
  campus_id?: string | null
  must_change_password?: boolean
}> {
  const [studentRes, facultyRes, adminRes] = await Promise.all([
    supabaseAdmin
      .from('students')
      .select('id, department_id, campus_id, must_change_password')
      .eq('id', authUserId)
      .maybeSingle(),
    supabaseAdmin
      .from('faculty')
      .select('id, role, department_id, campus_id')
      .eq('id', authUserId)
      .maybeSingle(),
    supabaseAdmin
      .from('admins')
      .select('id')
      .eq('id', authUserId)
      .maybeSingle(),
  ])

  if (studentRes.data) {
    const s = studentRes.data
    return {
      role: 'student',
      redirectTo: ROLE_DASHBOARD_MAP['student'],
      department_id: s.department_id,
      campus_id: s.campus_id,
      must_change_password: s.must_change_password,
    }
  }

  if (facultyRes.data) {
    const f = facultyRes.data
    const role = f.role as Role
    return {
      role,
      redirectTo: ROLE_DASHBOARD_MAP[role],
      department_id: f.department_id,
      campus_id: f.campus_id,
    }
  }

  if (adminRes.data) {
    return { role: 'superadmin', redirectTo: ROLE_DASHBOARD_MAP['superadmin'] }
  }

  return { role: null, redirectTo: null }
}