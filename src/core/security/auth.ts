import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { NextResponse } from 'next/server'

export interface SessionUser {
  id: string
  email: string
  name: string
  role: string
  department_id?: string
  campus_id?: string
}

// Get current session user — returns null if not logged in
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null
  return session.user as SessionUser
}

// Verify role — returns error response if unauthorized
export async function verifyRole(allowedRoles: string[]) {
  const user = await getSessionUser()

  if (!user) {
    return {
      user: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  if (!allowedRoles.includes(user.role)) {
    return {
      user: null,
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  return { user, error: null }
}