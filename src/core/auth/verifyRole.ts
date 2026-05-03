import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

async function getRole() {
  const session = await getServerSession(authOptions)
  return (session?.user as any)?.role ?? null
}

export async function verifyHod() {
  const role = await getRole()
  if (role === 'hod') return { success: true, role }
  return { success: false, error: 'Forbidden', status: 403 }
}

export async function verifyStudent() {
  const role = await getRole()
  if (role === 'student') return { success: true, role }
  return { success: false, error: 'Forbidden', status: 403 }
}

export async function verifyTeacher() {
  const role = await getRole()
  if (role === 'teaching_staff') return { success: true, role }
  return { success: false, error: 'Forbidden', status: 403 }
}

export async function verifySuperadmin() {
  const role = await getRole()
  if (role === 'superadmin') return { success: true, role }
  return { success: false, error: 'Forbidden', status: 403 }
}
