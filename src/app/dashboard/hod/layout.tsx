import { verifyHod } from '@/core/auth/verifyRole'
import { redirect } from 'next/navigation'

export default async function HodLayout({ children }: { children: React.ReactNode }) {
  const auth = await verifyHod()
  if (!auth.success) redirect('/login')
  return <>{children}</>
}
