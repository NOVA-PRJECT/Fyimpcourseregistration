import { Injectable, Logger } from '@nestjs/common'
import { SupabaseService } from '../database/supabase.service'

export interface AuditLogEntry {
  eventType: string
  userId: string
  userRole: string
  action: string
  resourceType: string
  resourceId?: string
  status: 'success' | 'failure'
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, unknown>
}

export const AuditEvents = {
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  CAMPUS_CREATED: 'campus_created',
  CAMPUS_UPDATED: 'campus_updated',
  CAMPUS_DELETED: 'campus_deleted',
  DEPARTMENT_CREATED: 'department_created',
  DEPARTMENT_UPDATED: 'department_updated',
  DEPARTMENT_DELETED: 'department_deleted',
  FACULTY_CREATED: 'faculty_created',
  FACULTY_UPDATED: 'faculty_updated',
  FACULTY_DELETED: 'faculty_deleted',
  STUDENT_CREATED: 'student_created',
  STUDENT_BULK_CREATED: 'student_bulk_created',
  STUDENT_PROMOTED: 'student_promoted',
  COURSE_CREATED: 'course_created',
  COURSE_UPDATED: 'course_updated',
  COURSE_DELETED: 'course_deleted',
  BLUEPRINT_SAVED: 'blueprint_saved',
  REGISTRATION_SUBMITTED: 'registration_submitted',
  TIMETABLE_GENERATED: 'timetable_generated',
  TIMETABLE_PUBLISHED: 'timetable_published',
  ALLOCATION_RUN_COMPLETED: 'allocation_run_completed',
  MANUAL_ALLOCATION: 'manual_allocation',
} as const

@Injectable()
export class AuditLoggerService {
  private readonly logger = new Logger(AuditLoggerService.name)

  constructor(private readonly supabase: SupabaseService) {}

  private static readonly UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

  async log(entry: AuditLogEntry): Promise<void> {
    try {
      const isValidUuid = entry.userId && AuditLoggerService.UUID_REGEX.test(entry.userId)
      const validUserId = isValidUuid ? entry.userId : null

      const enrichedMetadata = {
        ...entry.metadata,
        ...(isValidUuid ? {} : { attempted_identifier: entry.userId }),
      }

      const logPayload = {
        log_type: 'audit_event',
        event_type: entry.eventType,
        user_id: validUserId,
        user_role: entry.userRole,
        action: entry.action,
        resource_type: entry.resourceType,
        resource_id: entry.resourceId ?? null,
        status: entry.status,
        ip_address: entry.ipAddress ?? null,
        user_agent: entry.userAgent ?? null,
        metadata: enrichedMetadata,
      }

      // 1. Attempt writing to unified system_logs table
      const { error } = await this.supabase.admin.from('system_logs').insert(logPayload)

      if (error) {
        // 2. Fallback to audit_logs view / legacy table
        const { error: fallbackError } = await this.supabase.admin.from('audit_logs').insert({
          event_type: entry.eventType,
          user_id: validUserId,
          user_role: entry.userRole,
          action: entry.action,
          resource_type: entry.resourceType,
          resource_id: entry.resourceId ?? null,
          status: entry.status,
          ip_address: entry.ipAddress ?? null,
          user_agent: entry.userAgent ?? null,
          metadata: enrichedMetadata,
        })

        if (fallbackError) {
          this.logger.warn(`Failed to persist audit log: ${fallbackError.message}`)
        }
      }
    } catch (err: any) {
      this.logger.warn(`Exception writing audit log: ${err.message}`)
    }
  }
}
