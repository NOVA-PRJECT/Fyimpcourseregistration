export const dynamic = 'force-dynamic'

import { verifyStudent } from '@/core/auth/verifyRole'
import { redirect } from 'next/navigation'
import { ROLE_DASHBOARD_MAP } from '@/core/security/routeConfig'
import { Role } from '@/core/constants/roles'

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const auth = await verifyStudent({ allowMustChangePassword: true })
  if (!auth.success) {
    if (auth.status === 401 || !auth.actualRole || auth.actualRole === 'student') redirect('/login')
    const fallback = ROLE_DASHBOARD_MAP[auth.actualRole as Role] ?? '/dashboard/student'
    redirect(fallback)
  }
  return <>{children}</>
}
