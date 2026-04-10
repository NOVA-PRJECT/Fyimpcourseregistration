import { verifyTeacher } from '@/core/auth/verifyRole'
import { redirect } from 'next/navigation'

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const auth = await verifyTeacher()
  if (!auth.success) redirect('/login')
  return <>{children}</>
}
