import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/core/database/supabaseAdmin'
import { verifyDirector } from '@/core/auth/verifyRole'

export const dynamic = 'force-dynamic'

export async function POST() {

  // Auth — verified campus_director only
  const auth = await verifyDirector()
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { data: promotedCount, error } = await supabaseAdmin
    .rpc('promote_campus_students', { p_campus_id: auth.campus_id })

  if (error) {
    console.error('promote-students RPC failed:', error)
    return NextResponse.json(
      { error: 'Failed to promote students' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    promoted_count: promotedCount,
    message: `${promotedCount} students promoted to next semester`,
  })
}
