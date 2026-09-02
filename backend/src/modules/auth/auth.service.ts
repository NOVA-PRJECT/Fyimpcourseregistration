import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { SupabaseService } from '../../core/database/supabase.service'
import { RateLimiterService } from '../../core/security/rate-limiter.service'
import { AuditLoggerService, AuditEvents } from '../../core/logging/audit-logger.service'
import { ServerLoggerService } from '../../core/logging/server-logger.service'
import { AuthUser, Role } from '../../core/auth/types'

export const ROLE_DASHBOARD_MAP: Record<Role, string> = {
  superadmin: '/dashboard/superadmin',
  campus_director: '/dashboard/director',
  hod: '/dashboard/hod',
  teaching_staff: '/dashboard/teacher',
  student: '/dashboard/student',
}

@Injectable()
export class AuthService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly rateLimiter: RateLimiterService,
    private readonly auditLogger: AuditLoggerService,
    private readonly serverLogger: ServerLoggerService,
  ) {}

  async login(email: string, password: string, ip: string) {
    const [ipLimit, emailLimit] = await Promise.all([
      this.rateLimiter.loginLimiter.limit(ip),
      this.rateLimiter.emailLoginLimiter.limit(email.toLowerCase()),
    ])

    if (!ipLimit.success) {
      throw new HttpException('Too many attempts. Please try again later.', HttpStatus.TOO_MANY_REQUESTS)
    }

    if (!emailLimit.success) {
      throw new HttpException('Too many attempts for this account. Please try again later.', HttpStatus.TOO_MANY_REQUESTS)
    }

    const { data: authData, error: authError } = await this.supabase.admin.auth.signInWithPassword({
      email,
      password,
    })

    if (authError || !authData?.user || !authData?.session) {
      await this.auditLogger.log({
        eventType: 'login_failed',
        userId: 'unknown',
        userRole: 'unknown',
        action: 'failed login attempt',
        resourceType: 'user',
        status: 'failure',
        ipAddress: ip,
        metadata: { email },
      })
      throw new UnauthorizedException('Invalid email or password. Please try again.')
    }

    await this.rateLimiter.resetLoginLimits(ip, email)

    const userId = authData.user.id
    const userRoleInfo = await this.determineUserRoute(userId)

    if (!userRoleInfo.role || !userRoleInfo.redirectTo) {
      throw new ForbiddenException('Account configuration mismatch: user role not found in portal database.')
    }

    const { role, redirectTo, department_id, campus_id, must_change_password } = userRoleInfo

    // Update Supabase Auth metadata
    await this.supabase.admin.auth.admin.updateUserById(userId, {
      user_metadata: { role },
      app_metadata: {
        role,
        department_id: department_id ?? null,
        campus_id: campus_id ?? null,
        must_change_password: must_change_password ?? false,
      },
    })

    await this.auditLogger.log({
      eventType: AuditEvents.USER_LOGIN,
      userId,
      userRole: role,
      action: 'user logged in',
      resourceType: 'user',
      resourceId: userId,
      status: 'success',
      ipAddress: ip,
    })

    return {
      token: authData.session.access_token,
      role,
      redirectTo,
      userId,
    }
  }

  async determineUserRoute(authUserId: string): Promise<{
    role: Role | null
    redirectTo: string | null
    department_id?: string | null
    campus_id?: string | null
    must_change_password?: boolean
  }> {
    const [studentRes, facultyRes, adminRes] = await Promise.all([
      this.supabase.admin
        .from('students')
        .select('id, department_id, campus_id, must_change_password')
        .eq('id', authUserId)
        .maybeSingle(),
      this.supabase.admin
        .from('faculty')
        .select('id, role, department_id, campus_id')
        .eq('id', authUserId)
        .maybeSingle(),
      this.supabase.admin
        .from('admins')
        .select('id')
        .eq('id', authUserId)
        .maybeSingle(),
    ])

    if (studentRes.data) {
      const s = studentRes.data
      return {
        role: 'student',
        redirectTo: ROLE_DASHBOARD_MAP['student'],
        department_id: s.department_id,
        campus_id: s.campus_id,
        must_change_password: s.must_change_password,
      }
    }

    if (facultyRes.data) {
      const f = facultyRes.data
      const role = f.role as Role
      return {
        role,
        redirectTo: ROLE_DASHBOARD_MAP[role],
        department_id: f.department_id,
        campus_id: f.campus_id,
      }
    }

    if (adminRes.data) {
      return { role: 'superadmin', redirectTo: ROLE_DASHBOARD_MAP['superadmin'] }
    }

    return { role: null, redirectTo: null }
  }

  async logout(user: AuthUser, ip: string) {
    if (user?.userId) {
      await this.auditLogger.log({
        eventType: AuditEvents.USER_LOGOUT,
        userId: user.userId,
        userRole: user.role,
        action: 'user logged out',
        resourceType: 'user',
        resourceId: user.userId,
        status: 'success',
        ipAddress: ip,
      })
    }
    return { success: true }
  }

  async getProfile(user: AuthUser) {
    const role = user.role

    if (role === 'student') {
      const { data: student, error } = await this.supabase.admin
        .from('students')
        .select('full_name, current_semester, department_id, campus_id, departments(name), campuses(name)')
        .eq('id', user.userId)
        .single()
      if (error) throw new BadRequestException('Student profile not found')
      return { role, profile: student }
    }

    if (role === 'hod' || role === 'campus_director' || role === 'teaching_staff') {
      const { data: faculty, error } = await this.supabase.admin
        .from('faculty')
        .select('full_name, campus_id, department_id, departments(name), campuses(name)')
        .eq('id', user.userId)
        .single()
      if (error) throw new BadRequestException('Faculty profile not found')
      return { role, profile: faculty }
    }

    if (role === 'superadmin') {
      const { data: admin, error } = await this.supabase.admin
        .from('admins')
        .select('full_name')
        .eq('id', user.userId)
        .single()
      if (error) throw new BadRequestException('Admin profile not found')
      return { role, profile: admin }
    }

    throw new ForbiddenException('Role not found or invalid')
  }
}
