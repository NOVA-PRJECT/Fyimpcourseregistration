import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { SupabaseService } from '../../database/supabase.service'
import { AuthUser, Role } from '../types'

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const token = this.extractToken(request)

    if (!token) {
      throw new UnauthorizedException('Authentication token missing')
    }

    this.validateMutatingOrigin(request)

    const { data: authData, error: authError } = await this.supabaseService.admin.auth.getUser(token)
    if (authError || !authData?.user) {
      throw new UnauthorizedException('Invalid or expired authentication session')
    }

    const user = authData.user
    const claimsRole = user.app_metadata?.role as Role | undefined
    let departmentId = user.app_metadata?.department_id as string | undefined
    let campusId = user.app_metadata?.campus_id as string | undefined
    let mustChangePassword = user.app_metadata?.must_change_password as boolean | undefined
    let currentSemester: number | undefined
    let fullName: string | undefined
    let role = claimsRole

    // If role or details missing from app_metadata, query DB tables
    if (!role || !campusId || (role === 'hod' && !departmentId)) {
      const [studentRes, facultyRes, adminRes] = await Promise.all([
        this.supabaseService.admin
          .from('students')
          .select('id, department_id, campus_id, must_change_password, current_semester, full_name')
          .eq('id', user.id)
          .maybeSingle(),
        this.supabaseService.admin
          .from('faculty')
          .select('id, role, department_id, campus_id, full_name')
          .eq('id', user.id)
          .maybeSingle(),
        this.supabaseService.admin
          .from('admins')
          .select('id')
          .eq('id', user.id)
          .maybeSingle(),
      ])

      if (studentRes.data) {
        role = 'student'
        departmentId = studentRes.data.department_id
        campusId = studentRes.data.campus_id
        mustChangePassword = studentRes.data.must_change_password
        currentSemester = studentRes.data.current_semester
        fullName = studentRes.data.full_name
      } else if (facultyRes.data) {
        role = facultyRes.data.role as Role
        departmentId = facultyRes.data.department_id
        campusId = facultyRes.data.campus_id
        fullName = facultyRes.data.full_name
      } else if (adminRes.data) {
        role = 'superadmin'
      }
    } else if (role === 'student') {
      const { data: s } = await this.supabaseService.admin
        .from('students')
        .select('department_id, campus_id, current_semester, full_name, must_change_password')
        .eq('id', user.id)
        .maybeSingle()
      if (s) {
        if (s.department_id) departmentId = s.department_id
        if (s.campus_id) campusId = s.campus_id
        currentSemester = s.current_semester
        fullName = s.full_name
        mustChangePassword = s.must_change_password
      }
    }

    if (!role) {
      throw new UnauthorizedException('User account not registered in portal')
    }

    const authUser: AuthUser = {
      userId: user.id,
      email: user.email ?? '',
      role,
      department_id: departmentId ?? null,
      campus_id: campusId ?? null,
      must_change_password: mustChangePassword ?? false,
      current_semester: currentSemester,
      full_name: fullName,
      token,
    }

    const rawUrl = (request.originalUrl || request.path || request.url || '') as string
    const cleanPath = rawUrl.split(/[?#]/)[0]
    const normalizedPath = cleanPath ? cleanPath.replace(/\/+$/, '') : '/'

    const ALLOWED_PWD_PATHS = new Set([
      '/api/student/change-password',
      '/api/student/dashboard-summary',
      '/api/auth/logout',
      '/api/auth/complete-password-reset',
      '/auth/complete-password-reset',
    ])

    const isAllowedPwdPath = ALLOWED_PWD_PATHS.has(normalizedPath)

    if (authUser.must_change_password && !isAllowedPwdPath) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Password change is required before accessing other portal features.',
        must_change_password: true,
      })
    }

    request.user = authUser
    return true
  }

  private extractToken(request: any): string | null {
    const authHeader = request.headers['authorization']
    if (authHeader && typeof authHeader === 'string') {
      const [type, token] = authHeader.split(' ')
      if (type?.toLowerCase() === 'bearer' && token) {
        return token
      }
    }

    if (request.cookies?.auth_token) {
      return request.cookies.auth_token
    }

    return null
  }

  private validateMutatingOrigin(request: any): void {
    const mutatingMethods = new Set(['POST', 'PUT', 'DELETE', 'PATCH'])
    const method = (request.method || '').toUpperCase()

    // If method is not mutating or caller used Bearer token header, ambient cookie CSRF is not a concern
    const authHeader = request.headers['authorization']
    if (
      !mutatingMethods.has(method) ||
      (authHeader && typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer '))
    ) {
      return
    }

    // Request is using ambient cookies for state mutation
    const originHeader = (request.headers['origin'] || request.headers['referer'] || '') as string
    if (!originHeader) {
      // Non-browser or server-to-server proxy call
      return
    }

    const rawOrigins = process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL.split(',').map((o) => o.trim()).filter(Boolean)
      : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001', 'http://127.0.0.1:3001']

    try {
      const parsedOrigin = new URL(originHeader).origin
      const isAllowed = rawOrigins.some((allowed) => {
        try {
          return new URL(allowed).origin === parsedOrigin
        } catch {
          return allowed === parsedOrigin
        }
      })

      if (!isAllowed && process.env.NODE_ENV === 'production') {
        throw new ForbiddenException('Cross-site request rejected')
      }
    } catch (err: any) {
      if (err instanceof ForbiddenException) throw err
      // invalid URL in originHeader - ignore
    }
  }
}
