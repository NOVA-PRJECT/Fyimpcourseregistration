import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common'
import { SupabaseService } from '../../core/database/supabase.service'
import { AuditLoggerService } from '../../core/logging/audit-logger.service'
import { ServerLoggerService } from '../../core/logging/server-logger.service'
import { AuthUser } from '../../core/auth/types'

@Injectable()
export class DirectorService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly auditLogger: AuditLoggerService,
    private readonly serverLogger: ServerLoggerService,
  ) {}

  async getSettings(user: AuthUser) {
    const { data: faculty, error: facultyError } = await this.supabase.admin
      .from('faculty')
      .select('full_name, campus_id')
      .eq('id', user.userId)
      .single()

    if (facultyError || !faculty) {
      throw new NotFoundException('Director profile not found')
    }

    const { data: campus } = await this.supabase.admin
      .from('campuses')
      .select('name')
      .eq('id', faculty.campus_id)
      .single()

    const { data: settings } = await this.supabase.admin
      .from('campus_settings')
      .select('deadline, last_promoted_at')
      .eq('campus_id', faculty.campus_id)
      .single()

    return {
      directorName: faculty.full_name,
      campusId: faculty.campus_id,
      campusName: campus?.name ?? 'Unknown',
      settings: settings ?? null,
    }
  }

  async updateSettings(body: { deadline: string }, user: AuthUser) {
    const campusId = user.campus_id
    if (!campusId) throw new BadRequestException('Campus ID missing')

    const { error } = await this.supabase.admin
      .from('campus_settings')
      .update({ deadline: body.deadline })
      .eq('campus_id', campusId)

    if (error) {
      throw new InternalServerErrorException('Failed to update campus settings')
    }

    await this.auditLogger.log({
      eventType: 'settings_modified',
      userId: user.userId,
      userRole: user.role,
      action: 'modified campus settings',
      resourceType: 'campus_settings',
      resourceId: campusId,
      status: 'success',
      metadata: { deadline: body.deadline },
    })

    return { success: true, message: 'Settings updated successfully' }
  }
}
