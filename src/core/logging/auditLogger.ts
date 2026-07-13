import { supabaseAdmin } from '@/core/database/supabaseAdmin'
import { logServerError } from './logger'

export interface AuditLogEntry {
  eventType: string
  userId: string
  userRole: string
  action: string
  resourceType: string
  resourceId?: string
  status: 'success' | 'failure'
  errorMessage?: string
  metadata?: Record<string, unknown>
  ipAddress?: string
}

export const AuditEvents = {
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  PASSWORD_CHANGED: 'password_changed',
  COURSE_SUBMITTED: 'course_submitted',
  STUDENT_CREATED: 'student_created',
  STUDENT_DELETED: 'student_deleted',
  STUDENT_BULK_CREATED: 'student_bulk_created',
  FACULTY_CREATED: 'faculty_created',
  FACULTY_DELETED: 'faculty_deleted',
  STUDENTS_PROMOTED: 'students_promoted',
  BLUEPRINT_SAVED: 'blueprint_saved',
  SETTINGS_MODIFIED: 'settings_modified',
  CAMPUS_CREATED: 'campus_created',
  DEPARTMENT_CREATED: 'department_created',
} as const

export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from('audit_logs').insert({
      event_type: entry.eventType,
      user_id: entry.userId,
      user_role: entry.userRole,
      action: entry.action,
      resource_type: entry.resourceType,
      resource_id: entry.resourceId ?? null,
      status: entry.status,
      error_message: entry.errorMessage ?? null,
      metadata: entry.metadata ?? null,
      ip_address: entry.ipAddress ?? null,
    })
    if (error) {
      logServerError('auditLogger', error, { eventType: entry.eventType })
    }
  } catch (err) {
    logServerError('auditLogger', err, { eventType: entry.eventType })
  }
}
