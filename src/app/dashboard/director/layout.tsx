export const dynamic = 'force-dynamic'

import { verifyDirector } from '@/core/auth/verifyRole'
import { redirect } from 'next/navigation'
import { ROLE_DASHBOARD_MAP } from '@/core/security/routeConfig'
import { Role } from '@/core/constants/roles'

export default async function DirectorLayout({ children }: { children: React.ReactNode }) {
  const auth = await verifyDirector()
  if (!auth.success) {
    if (auth.status === 401 || !auth.actualRole || auth.actualRole === 'campus_director') redirect('/login')
    const fallback = ROLE_DASHBOARD_MAP[auth.actualRole as Role] ?? '/dashboard/student'
    redirect(fallback)
  }
  return <>{children}</>
}
