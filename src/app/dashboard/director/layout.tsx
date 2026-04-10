import { verifyDirector } from '@/core/auth/verifyRole'
import { redirect } from 'next/navigation'

export default async function DirectorLayout({ children }: { children: React.ReactNode }) {
  const auth = await verifyDirector()
  if (!auth.success) redirect('/login')
  return <>{children}</>
}
