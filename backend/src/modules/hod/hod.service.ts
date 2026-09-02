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
import { z } from 'zod'

function generatePathwayId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  const suffix = Math.random().toString(36).slice(2, 6)
  return `${slug}-${suffix}`
}

@Injectable()
export class HodService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly auditLogger: AuditLoggerService,
    private readonly serverLogger: ServerLoggerService,
  ) {}

  // ──────────────── Blueprint ────────────────
  async getBlueprint(semester: number, user: AuthUser) {
    const { data, error } = await this.supabase.admin
      .from('semester_blueprints')
      .select('*')
      .eq('department_id', user.department_id)
      .eq('semester', semester)
      .maybeSingle()

    if (error) {
      throw new InternalServerErrorException('Failed to fetch blueprint')
    }
    return data ?? null
  }

  async updateBlueprint(
    body: {
      semester: number
      min_credits: number
      max_credits: number
      pathways: any[]
    },
    user: AuthUser,
  ) {
    const { semester, min_credits, max_credits, pathways } = body

    const pathwaysWithIds = (pathways || []).map((p: any) => ({
      ...p,
      id: p.id && p.id.trim() !== '' ? p.id : generatePathwayId(p.name),
    }))

    const payload = {
      department_id: user.department_id,
      semester,
      min_credits,
      max_credits,
      pathways: pathwaysWithIds,
    }

    const { error } = await this.supabase.admin
      .from('semester_blueprints')
      .upsert(payload, { onConflict: 'department_id,semester' })

    if (error) throw new InternalServerErrorException('Failed to save blueprint')

    await this.auditLogger.log({
      eventType: AuditEvents.BLUEPRINT_SAVED,
      userId: user.userId,
      userRole: user.role,
      action: `saved blueprint for semester ${semester}`,
      resourceType: 'blueprint',
      status: 'success',
      metadata: { semester, department_id: user.department_id },
    })

    return { success: true, message: 'Blueprint saved successfully' }
  }

  // ──────────────── Courses ────────────────
  async getCourses(semester: number, user: AuthUser, ownOnly?: boolean) {
    if (ownOnly) {
      const { data, error } = await this.supabase.admin
        .from('courses')
        .select('*, departments(name, code, campus_id)')
        .eq('department_id', user.department_id)
        .eq('semester', semester)
        .order('category')

      if (error) throw new InternalServerErrorException('Failed to fetch courses')

      return (data ?? []).map((c: any) => ({
        ...c,
        department_name: c.departments?.name ?? '',
        department_code: c.departments?.code ?? '',
        is_own_campus: true,
        is_own_dept: true,
      }))
    }

    const { data: depts } = await this.supabase.admin
      .from('departments')
      .select('id')
      .eq('campus_id', user.campus_id)

    const campusDeptIds = depts && depts.length > 0 ? depts.map((d) => d.id) : [user.department_id]

    const { data, error } = await this.supabase.admin
      .from('courses')
      .select('*, departments(name, code, campus_id)')
      .or(`department_id.in.(${campusDeptIds.join(',')}),category.eq.AEC`)
      .eq('semester', semester)
      .order('category')

    if (error) throw new InternalServerErrorException('Failed to fetch courses')

    return (data ?? []).map((c: any) => ({
      ...c,
      department_name: c.departments?.name ?? '',
      department_code: c.departments?.code ?? '',
      is_own_campus: campusDeptIds.includes(c.department_id),
      is_own_dept: c.department_id === user.department_id,
    }))
  }

  async createCourse(body: any, user: AuthUser) {
    const {
      course_code,
      title,
      semester,
      credits,
      theory_hours_per_week,
      practical_hours_per_week,
      category,
      tag,
    } = body

    const { data: created, error } = await this.supabase.admin
      .from('courses')
      .insert({
        course_code: course_code.toUpperCase(),
        title,
        semester,
        credits,
        theory_hours_per_week: theory_hours_per_week ?? 0,
        practical_hours_per_week: practical_hours_per_week ?? 0,
        category,
        tag: tag || null,
        department_id: user.department_id,
      })
      .select('id')
      .single()

    if (error) {
      if (error.code === '23505') {
        throw new ConflictException('Course code already exists')
      }
      throw new InternalServerErrorException('Failed to add course')
    }

    await this.auditLogger.log({
      eventType: AuditEvents.COURSE_CREATED,
      userId: user.userId,
      userRole: user.role,
      action: `created course: ${course_code.toUpperCase()}`,
      resourceType: 'course',
      resourceId: created?.id,
      status: 'success',
    })

    return { success: true, message: 'Course added successfully' }
  }

  async updateCourse(id: string, body: any, user: AuthUser) {
    const {
      course_code,
      title,
      credits,
      theory_hours_per_week,
      practical_hours_per_week,
      category,
      tag,
    } = body

    const { error } = await this.supabase.admin
      .from('courses')
      .update({
        course_code: course_code.toUpperCase(),
        title,
        credits,
        theory_hours_per_week: theory_hours_per_week ?? 0,
        practical_hours_per_week: practical_hours_per_week ?? 0,
        category,
        tag: tag || null,
      })
      .eq('id', id)
      .eq('department_id', user.department_id)

    if (error) throw new InternalServerErrorException('Failed to update course')

    await this.auditLogger.log({
      eventType: AuditEvents.COURSE_UPDATED,
      userId: user.userId,
      userRole: user.role,
      action: `updated course: ${course_code.toUpperCase()}`,
      resourceType: 'course',
      resourceId: id,
      status: 'success',
    })

    return { success: true, message: 'Course updated successfully' }
  }

  async deleteCourse(courseId: string, user: AuthUser) {
    const { error } = await this.supabase.admin
      .from('courses')
      .delete()
      .eq('id', courseId)
      .eq('department_id', user.department_id)

    if (error) throw new InternalServerErrorException('Failed to delete course')

    await this.auditLogger.log({
      eventType: AuditEvents.COURSE_DELETED,
      userId: user.userId,
      userRole: user.role,
      action: `deleted course: ${courseId}`,
      resourceType: 'course',
      resourceId: courseId,
      status: 'success',
    })

    return { success: true, message: 'Course deleted successfully' }
  }

  // ──────────────── Departments ────────────────
  async getDepartments(user: AuthUser) {
    const { data, error } = await this.supabase.admin
      .from('departments')
      .select('id, name, code, campus_id, campuses (name)')
      .eq('campus_id', user.campus_id)
      .order('name')

    if (error) throw new InternalServerErrorException('Failed to fetch departments')
    return data ?? []
  }

  // ──────────────── Students ────────────────
  async getStudents(semester: number | undefined, user: AuthUser) {
    let query = this.supabase.admin
      .from('students')
      .select('id, full_name, current_semester, cap_application_number')
      .eq('department_id', user.department_id)

    if (semester) {
      query = query.eq('current_semester', semester)
    }

    const { data, error } = await query.order('full_name')
    if (error) {
      console.error('[HOD getStudents error]', error)
      throw new InternalServerErrorException('Failed to fetch students')
    }
    return data ?? []
  }

  async addStudent(
    body: {
      full_name: string
      email: string
      password?: string
      current_semester: number
      academic_year_joined: string
    },
    user: AuthUser,
  ) {
    const { full_name, email, current_semester, academic_year_joined } = body
    const password = body.password || 'Welcome@123'

    const { data: authData, error: authError } = await this.supabase.admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError || !authData?.user) {
      throw new BadRequestException(authError?.message || 'Failed to create auth user')
    }

    const studentId = authData.user.id

    const { error: insertError } = await this.supabase.admin
      .from('students')
      .insert({
        id: studentId,
        full_name,
        email,
        current_semester,
        academic_year_joined,
        department_id: user.department_id,
        campus_id: user.campus_id,
        must_change_password: true,
      })

    if (insertError) {
      await this.supabase.admin.auth.admin.deleteUser(studentId)
      throw new BadRequestException(insertError.message || 'Failed to insert student record')
    }

    await this.supabase.admin.auth.admin.updateUserById(studentId, {
      app_metadata: {
        role: 'student',
        department_id: user.department_id,
        campus_id: user.campus_id,
        must_change_password: true,
      },
      user_metadata: { role: 'student' },
    })

    await this.auditLogger.log({
      eventType: AuditEvents.STUDENT_CREATED,
      userId: user.userId,
      userRole: user.role,
      action: `added student: ${full_name} (${email})`,
      resourceType: 'student',
      resourceId: studentId,
      status: 'success',
    })

    return { success: true, message: 'Student added successfully' }
  }

  async updateStudent(body: { id: string; full_name: string; current_semester: number }, user: AuthUser) {
    const { id, full_name, current_semester } = body

    const { error } = await this.supabase.admin
      .from('students')
      .update({ full_name, current_semester })
      .eq('id', id)
      .eq('department_id', user.department_id)

    if (error) throw new InternalServerErrorException('Failed to update student')

    return { success: true, message: 'Student updated successfully' }
  }

  async removeStudent(studentId: string, user: AuthUser) {
    const { error } = await this.supabase.admin
      .from('students')
      .delete()
      .eq('id', studentId)
      .eq('department_id', user.department_id)

    if (error) throw new InternalServerErrorException('Failed to delete student record')

    await this.supabase.admin.auth.admin.deleteUser(studentId)

    return { success: true, message: 'Student removed successfully' }
  }

  async bulkCreateStudents(rows: any[], batchPassword: string, user: AuthUser) {
    if (!rows || rows.length === 0) {
      throw new BadRequestException('No student data provided')
    }

    const defaultPassword = batchPassword || 'Student@123'
    const results: any[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const fullName = row.full_name || row['Full Name'] || row.name
      const email = row.email || row['Email']
      const semester = Number(row.current_semester || row['Current Semester'] || row.semester || 1)
      const academicYear = String(row.academic_year_joined || row['Academic Year Joined'] || '2026-27')

      if (!fullName || !email) {
        results.push({ row: i + 1, email: email || '', status: 'error', issues: ['Missing name or email'] })
        continue
      }

      try {
        const { data: authData, error: authErr } = await this.supabase.admin.auth.admin.createUser({
          email: String(email).trim().toLowerCase(),
          password: defaultPassword,
          email_confirm: true,
        })

        if (authErr || !authData?.user) {
          results.push({ row: i + 1, email, status: 'error', issues: [authErr?.message || 'Auth creation failed'] })
          continue
        }

        const sid = authData.user.id
        const { error: dbErr } = await this.supabase.admin.from('students').insert({
          id: sid,
          full_name: fullName,
          email: String(email).trim().toLowerCase(),
          current_semester: semester,
          academic_year_joined: academicYear,
          department_id: user.department_id,
          campus_id: user.campus_id,
          must_change_password: true,
        })

        if (dbErr) {
          await this.supabase.admin.auth.admin.deleteUser(sid)
          results.push({ row: i + 1, email, status: 'error', issues: [dbErr.message] })
          continue
        }

        await this.supabase.admin.auth.admin.updateUserById(sid, {
          app_metadata: {
            role: 'student',
            department_id: user.department_id,
            campus_id: user.campus_id,
            must_change_password: true,
          },
          user_metadata: { role: 'student' },
        })

        results.push({ row: i + 1, email, status: 'success' })
      } catch (err: any) {
        results.push({ row: i + 1, email, status: 'error', issues: [err.message] })
      }
    }

    await this.auditLogger.log({
      eventType: AuditEvents.STUDENT_BULK_CREATED,
      userId: user.userId,
      userRole: user.role,
      action: `bulk created students in department ${user.department_id}`,
      resourceType: 'student',
      status: 'success',
      metadata: { count: results.filter((r) => r.status === 'success').length },
    })

    return { success: true, results }
  }

  async exportStudentsExcel(semester: number | undefined, user: AuthUser) {
    let query = this.supabase.admin
      .from('student_registrations')
      .select(`
        student_id,
        semester,
        students!inner(full_name, department_id),
        selected_courses
      `)
      .eq('students.department_id', user.department_id)

    if (semester) {
      query = query.eq('semester', semester)
    }

    const { data: registrations, error } = await query
    if (error) throw new InternalServerErrorException('Failed to fetch registration records')

    const rows = (registrations ?? []).map((reg: any) => {
      const student = reg.students
      const courses: any[] = reg.selected_courses ?? []
      return {
        name: student?.full_name ?? '—',
        sem: reg.semester,
        paper_1: courses[0]?.title ?? '',
        paper_2: courses[1]?.title ?? '',
        paper_3: courses[2]?.title ?? '',
        paper_4: courses[3]?.title ?? '',
        paper_5: courses[4]?.title ?? '',
        paper_6: courses[5]?.title ?? '',
      }
    })

    return rows
  }
}
