import { NextResponse } from 'next/server'
import { verifyDirector, handleAuthError } from '@/core/auth/verifyRole'
import { supabaseAdmin } from '@/core/database/supabaseAdmin'
import { getSupabaseServerClient } from '@/core/database/supabaseClient'
import { deleteAuthUser } from '@/core/auth/deleteAuthUser'
import { logServerError } from '@/core/logging/logger'
import { adminCrudLimiter } from '@/core/security/rateLimiter'
import { logAuditEvent, AuditEvents } from '@/core/logging/auditLogger'

export const dynamic = 'force-dynamic'

export async function POST() {

  // Auth — verified campus_director only
  const auth = await verifyDirector()
  if (!auth.success) return handleAuthError(auth)

  const { success: withinLimit } = await adminCrudLimiter.limit(auth.userId)
  if (!withinLimit) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  const supabase = await getSupabaseServerClient()

  // Idempotency check: Get the last_promoted_at timestamp
  const { data: settings, error: settingsFetchError } = await supabaseAdmin
    .from('campus_settings')
    .select('last_promoted_at')
    .eq('campus_id', auth.campus_id)
    .single()

  if (settingsFetchError) {
    logServerError('/api/admin/campus/promote-students', settingsFetchError, { userId: auth.userId, step: 'settings_idempotency_fetch' })
    return NextResponse.json({ error: 'Failed to retrieve campus settings' }, { status: 500 })
  }

  if (settings?.last_promoted_at) {
    const lastPromoted = new Date(settings.last_promoted_at)
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    if (lastPromoted > ninetyDaysAgo) {
      return NextResponse.json(
        { error: 'Accidental double-promotion blocked: students have already been promoted within the last 90 days.' },
        { status: 400 }
      )
    }
  }

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
    logServerError('/api/admin/campus/promote-students', error, { userId: auth.userId, method: 'POST', campusId: auth.campus_id })
    return NextResponse.json({ error: 'Failed to promote students' }, { status: 500 })
  }

  const { error: settingsError } = await supabaseAdmin
    .from('campus_settings')
    .update({ last_promoted_at: new Date().toISOString() })
    .eq('campus_id', auth.campus_id)

  if (settingsError) {
    logServerError('/api/admin/campus/promote-students', settingsError, {
      userId: auth.userId,
      campusId: auth.campus_id,
      step: 'settings_timestamp_update',
    })
  }

  // Delete auth users for graduated students (semester was 10, trigger deleted their DB rows)
  if (nearMaxStudents && nearMaxStudents.length > 0) {
    await Promise.all(
      nearMaxStudents.map(async (student) => {
        try {
          const { error: authDeleteError } = await deleteAuthUser(student.id)
          if (authDeleteError) {
            logServerError('/api/admin/campus/promote-students', authDeleteError, { userId: auth.userId, targetStudentId: student.id, step: 'auth_deletion' })
          }
        } catch (err) {
          logServerError('/api/admin/campus/promote-students', err, { userId: auth.userId, targetStudentId: student.id, step: 'auth_deletion_try_catch' })
        }
      })
    )
  }

  await logAuditEvent({
    eventType: AuditEvents.STUDENTS_PROMOTED,
    userId: auth.userId,
    userRole: auth.role,
    action: `promoted students for campus ${auth.campus_id}`,
    resourceType: 'campus',
    resourceId: auth.campus_id,
    status: 'success',
    metadata: {
      promoted_count: promotedCount,
      graduated_count: nearMaxStudents?.length ?? 0,
    }
  })

  return NextResponse.json({
    success: true,
    promoted_count: promotedCount,
    graduated_count: nearMaxStudents?.length ?? 0,
    message: `${promotedCount} students promoted to next semester`,
  })
}
