import { NextResponse } from 'next/server'
import { verifyHod } from '@/core/auth/verifyRole'
import { supabaseAdmin } from '@/core/database/supabaseAdmin'

export const dynamic = 'force-dynamic'

// GET — return departments for the HOD's campus (for blueprint dropdown)
export async function GET() {
  const auth = await verifyHod()
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { data, error } = await supabaseAdmin
    .from('departments')
    .select('id, name, code')
    .eq('campus_id', auth.campus_id)
    .order('name')

  if (error) {
    console.error('hod/departments GET failed:', error)
    return NextResponse.json({ error: 'Failed to fetch departments' }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}
