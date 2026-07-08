import { NextResponse } from 'next/server'
import { verifyHod, handleAuthError } from '@/core/auth/verifyRole'
import { supabaseAdmin } from '@/core/database/supabaseAdmin'
import { logServerError } from '@/core/logging/logger'

export const dynamic = 'force-dynamic'

// GET — return departments for the HOD's campus (for blueprint dropdown)
export async function GET() {
  const auth = await verifyHod()
  if (!auth.success) return handleAuthError(auth)

  const { data, error } = await supabaseAdmin
    .from('departments')
    .select('id, name, code')
    .eq('campus_id', auth.campus_id)
    .order('name')

  if (error) {
    logServerError('/api/hod/departments', error, { userId: auth.userId })
    return NextResponse.json({ error: 'Failed to fetch departments' }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}
