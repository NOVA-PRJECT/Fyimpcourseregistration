import { NextResponse } from 'next/server'
import { verifyDirector } from '@/core/auth/verifyRole'
import { supabaseAdmin } from '@/core/database/supabaseAdmin'
import { getSupabaseServerClient } from '@/core/database/supabaseClient'

export const dynamic = 'force-dynamic'

export async function POST() {

  // Auth — verified campus_director only
  const auth = await verifyDirector()
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const supabase = await getSupabaseServerClient()

  // Get the list of students whose semester will become > 10 (so we can clean up their auth users)
  const { data: nearMaxStudents } = await supabaseAdmin
    .from('students')
    .select('id, current_semester')
    .eq('campus_id', auth.campus_id)
    .eq('current_semester', 10) // these will be promoted to 11 → graduated

  // Run the promote RPC
  const { data: promotedCount, error } = await supabase
    .rpc('promote_campus_students', { p_campus_id: auth.campus_id })

  if (error) {
    console.error('promote-students RPC failed:', error)
    return NextResponse.json({ error: 'Failed to promote students' }, { status: 500 })
  }

  // Update last_promoted_at on campus_settings
  await supabaseAdmin
    .from('campus_settings')
    .update({ last_promoted_at: new Date().toISOString() })
    .eq('campus_id', auth.campus_id)

  // Delete auth users for graduated students (semester was 10, trigger deleted their DB rows)
  if (nearMaxStudents && nearMaxStudents.length > 0) {
    for (const student of nearMaxStudents) {
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(student.id)
      if (authDeleteError) {
        console.error(`promote-students — failed to delete auth user ${student.id}:`, authDeleteError)
      }
    }
  }

  return NextResponse.json({
    success: true,
    promoted_count: promotedCount,
    graduated_count: nearMaxStudents?.length ?? 0,
    message: `${promotedCount} students promoted to next semester`,
  })
}
