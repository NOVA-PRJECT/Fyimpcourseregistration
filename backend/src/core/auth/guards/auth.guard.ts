import {
  CanActivate,
  ExecutionContext,
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
        .select('current_semester, full_name, must_change_password')
        .eq('id', user.id)
        .maybeSingle()
      if (s) {
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

    if (request.cookies?.['sb-access-token']) {
      return request.cookies['sb-access-token']
    }

    return null
  }
}
