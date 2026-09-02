export const dynamic = 'force-dynamic'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ROLE_DASHBOARD_MAP } from '@/core/security/routeConfig'
import { Role } from '@/core/constants/roles'

export default async function HodLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const role = cookieStore.get('user_role')?.value as Role | undefined
  if (!role || role !== 'hod') {
    if (!role) redirect('/login')
    redirect(ROLE_DASHBOARD_MAP[role] ?? '/login')
  }
  return <>{children}</>
}
