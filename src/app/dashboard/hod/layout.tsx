export const dynamic = 'force-dynamic'

import { verifyHod } from '@/core/auth/verifyRole'
import { redirect } from 'next/navigation'
import { ROLE_DASHBOARD_MAP } from '@/core/security/routeConfig'
import { Role } from '@/core/constants/roles'

export default async function HodLayout({ children }: { children: React.ReactNode }) {
  const auth = await verifyHod()
  if (!auth.success) {
    if (auth.status === 401 || !auth.actualRole || auth.actualRole === 'hod') redirect('/login')
    const fallback = ROLE_DASHBOARD_MAP[auth.actualRole as Role] ?? '/dashboard/student'
    redirect(fallback)
  }
  return <>{children}</>
}
