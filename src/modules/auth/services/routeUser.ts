import { supabaseAdmin } from '@/core/database/supabaseAdmin'
import { ROLE_DASHBOARD_MAP } from '@/core/security/routeConfig'
import { Role } from '@/core/constants/roles'

export async function determineUserRoute(authUserId: string): Promise<{
  role: Role | null
  redirectTo: string | null
}> {

  // Check students table
  const { data: student } = await supabaseAdmin
    .from('students')
    .select('id')
    .eq('id', authUserId)
    .single()

  if (student) {
    return { role: 'student', redirectTo: ROLE_DASHBOARD_MAP['student'] }
  }

  // Check faculty table
  const { data: faculty } = await supabaseAdmin
    .from('faculty')
    .select('id, role')
    .eq('id', authUserId)
    .single()

  if (faculty) {
    const role = faculty.role as Role
    return { role, redirectTo: ROLE_DASHBOARD_MAP[role] }
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