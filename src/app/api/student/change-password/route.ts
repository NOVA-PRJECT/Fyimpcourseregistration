import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/core/database/supabaseAdmin'
import { verifyStudent } from '@/core/auth/verifyRole'
import { changePasswordLimiter } from '@/core/security/rateLimiter'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const ChangePasswordSchema = z.object({
  new_password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirm_password: z.string().min(1, 'Please confirm your password'),
}).refine(data => data.new_password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})

export async function POST(request: NextRequest) {

  const auth = await verifyStudent({ allowMustChangePassword: true })
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  // Rate limit by student user ID
  const { success: withinLimit } = await changePasswordLimiter.limit(auth.userId)
  if (!withinLimit) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429 }
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const result = ChangePasswordSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    )
  }

  // Update password via admin API (service-role)
  const { error: pwError } = await supabaseAdmin.auth.admin.updateUserById(
    auth.userId,
    { password: result.data.new_password }
  )

  if (pwError) {
    console.error('change-password — auth update failed:', pwError)
    return NextResponse.json({ error: 'Failed to update password' }, { status: 500 })
  }

  // Clear the must_change_password flag
  const { error: flagError } = await supabaseAdmin
    .from('students')
    .update({ must_change_password: false })
    .eq('id', auth.userId)

  if (flagError) {
    console.error('change-password — flag update failed:', flagError)
    // Password was already changed; still return success but log the discrepancy
    return NextResponse.json({ success: true, warning: 'Password changed, but flag update failed. Please contact support.' })
  }

  return NextResponse.json({ success: true, message: 'Password changed successfully' })
}
