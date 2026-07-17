export const dynamic = 'force-dynamic'

import { verifyTeacher } from '@/core/auth/verifyRole'
import { redirect } from 'next/navigation'
import { ROLE_DASHBOARD_MAP } from '@/core/security/routeConfig'
import { Role } from '@/core/constants/roles'

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const auth = await verifyTeacher()
  if (!auth.success) {
    if (auth.status === 401 || !auth.actualRole || auth.actualRole === 'teaching_staff') redirect('/login')
    const fallback = ROLE_DASHBOARD_MAP[auth.actualRole as Role] ?? '/dashboard/student'
    redirect(fallback)
  }
  return <>{children}</>
}
