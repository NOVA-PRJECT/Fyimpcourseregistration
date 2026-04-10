import { verifySuperAdmin } from '@/core/auth/verifyRole'
import { redirect } from 'next/navigation'

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const auth = await verifySuperAdmin()
  if (!auth.success) redirect('/login')
  return <>{children}</>
}
