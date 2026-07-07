import { verifyStudent } from '@/core/auth/verifyRole'
import { redirect } from 'next/navigation'

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const auth = await verifyStudent({ allowMustChangePassword: true })
  if (!auth.success) redirect('/login')
  return <>{children}</>
}
