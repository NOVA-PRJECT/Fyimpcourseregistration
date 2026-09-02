import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common'
import { SupabaseService } from '../../core/database/supabase.service'
import { AuditLoggerService, AuditEvents } from '../../core/logging/audit-logger.service'
import { ServerLoggerService } from '../../core/logging/server-logger.service'
import { AuthUser } from '../../core/auth/types'

@Injectable()
export class AdminService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly auditLogger: AuditLoggerService,
    private readonly serverLogger: ServerLoggerService,
  ) {}

  // ──────────────── Campuses ────────────────
  async getCampuses() {
    const { data, error } = await this.supabase.admin
      .from('campuses')
      .select('*')
      .order('name')
    if (error) throw new InternalServerErrorException('Failed to fetch campuses')
    return data ?? []
  }

  async createCampus(name: string, code: string, user: AuthUser) {
    const { data: createdCampus, error } = await this.supabase.admin
      .from('campuses')
      .insert({ name, code: code.toUpperCase() })
      .select('id')
      .single()

    if (error) {
      if (error.code === '23505') {
        throw new ConflictException('Campus name or code already exists')
      }
      throw new InternalServerErrorException('Failed to add campus')
    }

    await this.auditLogger.log({
      eventType: AuditEvents.CAMPUS_CREATED,
      userId: user.userId,
      userRole: user.role,
      action: `created campus: ${name} (${code.toUpperCase()})`,
      resourceType: 'campus',
      resourceId: createdCampus?.id,
      status: 'success',
    })

    return { success: true, message: 'Campus added successfully' }
  }

  async updateCampus(id: string, name: string, code: string, user: AuthUser) {
    const { error } = await this.supabase.admin
      .from('campuses')
      .update({ name, code: code.toUpperCase() })
      .eq('id', id)

    if (error) throw new InternalServerErrorException('Failed to update campus')

    await this.auditLogger.log({
      eventType: AuditEvents.CAMPUS_UPDATED,
      userId: user.userId,
      userRole: user.role,
      action: `updated campus: ${name} (${code.toUpperCase()})`,
      resourceType: 'campus',
      resourceId: id,
      status: 'success',
    })

    return { success: true, message: 'Campus updated successfully' }
  }

  async deleteCampus(campusId: string, user: AuthUser) {
    const { data: students } = await this.supabase.admin
      .from('students')
      .select('id')
      .eq('campus_id', campusId)

    const { data: faculty } = await this.supabase.admin
      .from('faculty')
      .select('id')
      .eq('campus_id', campusId)

    const { error } = await this.supabase.admin.rpc('delete_campus_cascade', {
      p_campus_id: campusId,
    })

    if (error) throw new InternalServerErrorException('Failed to delete campus')

    const allUserIds = [
      ...(students ?? []).map((s) => s.id),
      ...(faculty ?? []).map((f) => f.id),
    ]

    if (allUserIds.length > 0) {
      await Promise.allSettled(
        allUserIds.map((id) => this.supabase.admin.auth.admin.deleteUser(id)),
      )
    }

    await this.auditLogger.log({
      eventType: AuditEvents.CAMPUS_DELETED,
      userId: user.userId,
      userRole: user.role,
      action: `deleted campus: ${campusId}`,
      resourceType: 'campus',
      resourceId: campusId,
      status: 'success',
    })

    return { success: true, message: 'Campus deleted successfully' }
  }

  // ──────────────── Departments ────────────────
  async getDepartments() {
    const { data, error } = await this.supabase.admin
      .from('departments')
      .select('id, name, code, campus_id, campuses (name)')
      .order('name')
    if (error) throw new InternalServerErrorException('Failed to fetch departments')
    return data ?? []
  }

  async createDepartment(name: string, code: string, campus_id: string, user: AuthUser) {
    const { data: createdDept, error } = await this.supabase.admin
      .from('departments')
      .insert({
        name,
        code: code.toUpperCase(),
        campus_id,
      })
      .select('id')
      .single()

    if (error) {
      if (error.code === '23505') {
        throw new ConflictException('Department name or code already exists')
      }
      throw new InternalServerErrorException('Failed to add department')
    }

    await this.auditLogger.log({
      eventType: AuditEvents.DEPARTMENT_CREATED,
      userId: user.userId,
      userRole: user.role,
      action: `created department: ${name} (${code.toUpperCase()})`,
      resourceType: 'department',
      resourceId: createdDept?.id,
      status: 'success',
      metadata: { campus_id },
    })

    return { success: true, message: 'Department added successfully' }
  }

  async updateDepartment(id: string, name: string, code: string, user: AuthUser) {
    const { error } = await this.supabase.admin
      .from('departments')
      .update({ name, code: code.toUpperCase() })
      .eq('id', id)

    if (error) throw new InternalServerErrorException('Failed to update department')

    await this.auditLogger.log({
      eventType: AuditEvents.DEPARTMENT_UPDATED,
      userId: user.userId,
      userRole: user.role,
      action: `updated department: ${name} (${code.toUpperCase()})`,
      resourceType: 'department',
      resourceId: id,
      status: 'success',
    })

    return { success: true, message: 'Department updated successfully' }
  }

  async deleteDepartment(deptId: string, user: AuthUser) {
    const { data: students } = await this.supabase.admin
      .from('students')
      .select('id')
      .eq('department_id', deptId)

    const { data: faculty } = await this.supabase.admin
      .from('faculty')
      .select('id')
      .eq('department_id', deptId)

    const { error } = await this.supabase.admin.rpc('delete_department_cascade', {
      p_dept_id: deptId,
    })

    if (error) throw new InternalServerErrorException('Failed to delete department')

    const allUserIds = [
      ...(students ?? []).map((s) => s.id),
      ...(faculty ?? []).map((f) => f.id),
    ]

    if (allUserIds.length > 0) {
      await Promise.allSettled(
        allUserIds.map((id) => this.supabase.admin.auth.admin.deleteUser(id)),
      )
    }

    await this.auditLogger.log({
      eventType: AuditEvents.DEPARTMENT_DELETED,
      userId: user.userId,
      userRole: user.role,
      action: `deleted department: ${deptId}`,
      resourceType: 'department',
      resourceId: deptId,
      status: 'success',
    })

    return { success: true, message: 'Department deleted successfully' }
  }

  // ──────────────── Faculty ────────────────
  async getFacultyList() {
    const { data, error } = await this.supabase.admin
      .from('faculty')
      .select('id, full_name, email, role, department_id, campus_id, departments (name), campuses (name)')
      .order('full_name')
    if (error) throw new InternalServerErrorException('Failed to fetch faculty list')
    return data ?? []
  }

  async createFaculty(body: {
    full_name: string
    email: string
    password: string
    role: string
    department_id?: string | null
    campus_id: string
  }, user: AuthUser) {
    const { full_name, email, password, role, department_id, campus_id } = body

    if (role === 'hod' && !department_id) {
      throw new BadRequestException('HOD must be assigned to a department')
    }

    if (role === 'campus_director' && department_id) {
      throw new BadRequestException('Campus Director cannot be assigned to a department')
    }

    const { data: authData, error: authError } = await this.supabase.admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError || !authData?.user) {
      const isDuplicate = authError?.message?.toLowerCase().includes('already') || authError?.status === 422
      throw new BadRequestException(isDuplicate ? 'A user with this email address has already been registered' : 'Failed to create auth account')
    }

    const authUserId = authData.user.id

    const { error: facultyError } = await this.supabase.admin
      .from('faculty')
      .insert({
        id: authUserId,
        full_name,
        email,
        role,
        department_id: department_id ?? null,
        campus_id,
      })

    if (facultyError) {
      await this.supabase.admin.auth.admin.deleteUser(authUserId)
      throw new BadRequestException(facultyError.code === '23503' ? 'Invalid department or campus selected' : 'Failed to create faculty record')
    }

    // Sync app_metadata
    await this.supabase.admin.auth.admin.updateUserById(authUserId, {
      app_metadata: {
        role,
        campus_id,
        department_id: department_id ?? null,
      },
    })

    await this.auditLogger.log({
      eventType: AuditEvents.FACULTY_CREATED,
      userId: user.userId,
      userRole: user.role,
      action: `created faculty: ${full_name} (${role})`,
      resourceType: 'faculty',
      resourceId: authUserId,
      status: 'success',
      metadata: { role, campus_id, department_id },
    })

    return {
      success: true,
      id: authUserId,
      message: `${role === 'hod' ? 'HOD' : role === 'campus_director' ? 'Campus Director' : 'Teacher'} account created successfully`,
    }
  }

  async updateFaculty(id: string, body: {
    full_name: string
    role: string
    department_id?: string | null
    campus_id: string
  }, user: AuthUser) {
    const { full_name, role, department_id, campus_id } = body

    const { error } = await this.supabase.admin
      .from('faculty')
      .update({
        full_name,
        role,
        department_id: department_id ?? null,
        campus_id,
      })
      .eq('id', id)

    if (error) throw new InternalServerErrorException('Failed to update faculty record')

    await this.supabase.admin.auth.admin.updateUserById(id, {
      app_metadata: {
        role,
        campus_id,
        department_id: department_id ?? null,
      },
    })

    await this.auditLogger.log({
      eventType: AuditEvents.FACULTY_UPDATED,
      userId: user.userId,
      userRole: user.role,
      action: `updated faculty: ${full_name}`,
      resourceType: 'faculty',
      resourceId: id,
      status: 'success',
    })

    return { success: true, message: 'Faculty updated successfully' }
  }

  async deleteFaculty(facultyId: string, user: AuthUser) {
    const { error } = await this.supabase.admin
      .from('faculty')
      .delete()
      .eq('id', facultyId)

    if (error) throw new InternalServerErrorException('Failed to delete faculty record')

    await this.supabase.admin.auth.admin.deleteUser(facultyId)

    await this.auditLogger.log({
      eventType: AuditEvents.FACULTY_DELETED,
      userId: user.userId,
      userRole: user.role,
      action: `deleted faculty: ${facultyId}`,
      resourceType: 'faculty',
      resourceId: facultyId,
      status: 'success',
    })

    return { success: true, message: 'Faculty deleted successfully' }
  }

  // ──────────────── Promote Students ────────────────
  async promoteStudents(director: AuthUser) {
    const campusId = director.campus_id
    if (!campusId) throw new BadRequestException('Campus assignment missing for director')

    const { data: settings } = await this.supabase.admin
      .from('campus_settings')
      .select('last_promoted_at')
      .eq('campus_id', campusId)
      .single()

    if (settings?.last_promoted_at) {
      const lastPromoted = new Date(settings.last_promoted_at)
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
      if (lastPromoted > ninetyDaysAgo) {
        throw new BadRequestException('Accidental double-promotion blocked: students have already been promoted within the last 90 days.')
      }
    }

    const { data: nearMaxStudents } = await this.supabase.admin
      .from('students')
      .select('id, current_semester')
      .eq('campus_id', campusId)
      .eq('current_semester', 10)

    const { data: promotedCount, error } = await this.supabase.admin.rpc('promote_campus_students', {
      p_campus_id: campusId,
    })

    if (error) throw new InternalServerErrorException('Failed to promote students')

    await this.supabase.admin
      .from('campus_settings')
      .update({ last_promoted_at: new Date().toISOString() })
      .eq('campus_id', campusId)

    if (nearMaxStudents && nearMaxStudents.length > 0) {
      await Promise.allSettled(
        nearMaxStudents.map((s) => this.supabase.admin.auth.admin.deleteUser(s.id)),
      )
    }

    await this.auditLogger.log({
      eventType: AuditEvents.STUDENT_PROMOTED,
      userId: director.userId,
      userRole: director.role,
      action: `promoted students for campus ${campusId}`,
      resourceType: 'campus',
      resourceId: campusId,
      status: 'success',
      metadata: {
        promoted_count: promotedCount,
        graduated_count: nearMaxStudents?.length ?? 0,
      },
    })

    return {
      success: true,
      promoted_count: promotedCount,
      graduated_count: nearMaxStudents?.length ?? 0,
      message: `${promotedCount} students promoted to next semester`,
    }
  }
}
