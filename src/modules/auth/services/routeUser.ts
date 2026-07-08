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

  // Check students table
  const { data: student } = await supabaseAdmin
    .from('students')
    .select('id, department_id, campus_id, must_change_password')
    .eq('id', authUserId)
    .single()

  if (student) {
    return {
      role: 'student',
      redirectTo: ROLE_DASHBOARD_MAP['student'],
      department_id: student.department_id,
      campus_id: student.campus_id,
      must_change_password: student.must_change_password,
    }
  }

  // Check faculty table
  const { data: faculty } = await supabaseAdmin
    .from('faculty')
    .select('id, role, department_id, campus_id')
    .eq('id', authUserId)
    .single()

  if (faculty) {
    const role = faculty.role as Role
    return {
      role,
      redirectTo: ROLE_DASHBOARD_MAP[role],
      department_id: faculty.department_id,
      campus_id: faculty.campus_id,
    }
  }

  // Check admins table
  const { data: admin } = await supabaseAdmin
    .from('admins')
    .select('id')
    .eq('id', authUserId)
    .single()

  if (admin) {
    return { role: 'superadmin', redirectTo: ROLE_DASHBOARD_MAP['superadmin'] }
  }

  return { role: null, redirectTo: null }
}