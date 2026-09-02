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
export class StudentService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly auditLogger: AuditLoggerService,
    private readonly serverLogger: ServerLoggerService,
  ) {}

  async getDashboardSummary(user: AuthUser) {
    const { data: student, error } = await this.supabase.admin
      .from('students')
      .select(`
        full_name,
        current_semester,
        academic_year_joined,
        must_change_password,
        departments (name),
        campuses (name)
      `)
      .eq('id', user.userId)
      .single()

    if (error || !student) {
      throw new NotFoundException('Student record not found')
    }

    const { data: reg } = await this.supabase.admin
      .from('student_registrations')
      .select('student_id')
      .eq('student_id', user.userId)
      .eq('semester', student.current_semester)
      .maybeSingle()

    const studentInfo = {
      full_name: student.full_name ?? '',
      current_semester: student.current_semester ?? 1,
      academic_year_joined: student.academic_year_joined ?? '—',
      department_name: (student.departments as any)?.name ?? 'Unknown',
      campus_name: (student.campuses as any)?.name ?? 'Unknown',
    }

    return {
      studentInfo,
      hasSubmission: !!reg,
      must_change_password: student.must_change_password,
    }
  }

  async changePassword(newPassword: string, user: AuthUser) {
    const { error: pwError } = await this.supabase.admin.auth.admin.updateUserById(
      user.userId,
      {
        password: newPassword,
        app_metadata: {
          role: 'student',
          department_id: user.department_id,
          campus_id: user.campus_id,
          must_change_password: false,
        },
      },
    )

    if (pwError) {
      throw new InternalServerErrorException('Failed to update password')
    }

    const { error: flagError } = await this.supabase.admin
      .from('students')
      .update({ must_change_password: false })
      .eq('id', user.userId)

    if (flagError) {
      throw new InternalServerErrorException('Failed to clear user password flag')
    }

    // Sign in to get fresh session token
    const { data: signInData, error: signInError } = await this.supabase.admin.auth.signInWithPassword({
      email: user.email,
      password: newPassword,
    })

    const freshToken = signInData?.session?.access_token

    return {
      success: true,
      token: freshToken,
      message: 'Password changed successfully',
    }
  }
}
