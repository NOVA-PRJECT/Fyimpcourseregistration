import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
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
      seat_limit,
      prerequisite_course_ids,
      allowed_department_ids,
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
        seat_limit: seat_limit ? Number(seat_limit) : 60,
        prerequisite_course_ids: Array.isArray(prerequisite_course_ids) ? prerequisite_course_ids : [],
        allowed_department_ids: Array.isArray(allowed_department_ids) ? allowed_department_ids : [],
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

    return { success: true, message: 'Course added successfully', id: created?.id }
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
      seat_limit,
      prerequisite_course_ids,
      allowed_department_ids,
    } = body

    const updatePayload: Record<string, any> = {
      course_code: course_code.toUpperCase(),
      title,
      credits,
      theory_hours_per_week: theory_hours_per_week ?? 0,
      practical_hours_per_week: practical_hours_per_week ?? 0,
      category,
      tag: tag || null,
    }

    if (seat_limit !== undefined) {
      updatePayload.seat_limit = seat_limit ? Number(seat_limit) : 60
    }
    if (prerequisite_course_ids !== undefined) {
      updatePayload.prerequisite_course_ids = Array.isArray(prerequisite_course_ids) ? prerequisite_course_ids : []
    }
    if (allowed_department_ids !== undefined) {
      updatePayload.allowed_department_ids = Array.isArray(allowed_department_ids) ? allowed_department_ids : []
    }

    const { error } = await this.supabase.admin
      .from('courses')
      .update(updatePayload)
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
      cap_application_number: string
      email: string
      password?: string
      current_semester: number
      academic_year_joined: string
    },
    user: AuthUser,
  ) {
    const { full_name, cap_application_number, email, current_semester, academic_year_joined } = body
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
        cap_application_number: cap_application_number.trim(),
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
      const capNumber = String(
        row.cap_application_number ||
        row['CAP Number'] ||
        row['cap_application_number'] ||
        row['cap_number'] ||
        `CAP${Date.now().toString().slice(-6)}${i + 1}`
      ).trim()

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
          cap_application_number: capNumber,
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
        slot_1_course_id,
        slot_2_course_id,
        slot_3_course_id,
        slot_4_course_id,
        slot_5_course_id,
        slot_6_course_id,
        selections,
        students!inner(full_name, department_id)
      `)
      .eq('students.department_id', user.department_id)

    if (semester) {
      query = query.eq('semester', semester)
    }

    const { data: registrations, error } = await query
    if (error) throw new InternalServerErrorException('Failed to fetch registration records')

    // Collect all course IDs from registrations to lookup titles
    const allCourseIds = new Set<string>()
    for (const reg of registrations ?? []) {
      for (let i = 1; i <= 6; i++) {
        const cid = (reg as any)[`slot_${i}_course_id`]
        if (cid) allCourseIds.add(cid)
      }
      const rawSel = (reg as any).selections
      const list = Array.isArray(rawSel) ? rawSel : Array.isArray(rawSel?.courses) ? rawSel.courses : []
      for (const item of list) {
        const cid = typeof item === 'string' ? item : item?.id || item?.course_id
        if (cid) allCourseIds.add(cid)
      }
    }

    const courseTitleMap = new Map<string, string>()
    if (allCourseIds.size > 0) {
      const { data: courseList } = await this.supabase.admin
        .from('courses')
        .select('id, title, course_code')
        .in('id', Array.from(allCourseIds))
      for (const c of courseList ?? []) {
        courseTitleMap.set(c.id, `${c.title} (${c.course_code})`)
      }
    }

    const rows = (registrations ?? []).map((reg: any) => {
      const student = reg.students
      const papers: string[] = []
      for (let i = 1; i <= 6; i++) {
        const cid = reg[`slot_${i}_course_id`]
        if (cid && courseTitleMap.has(cid)) {
          papers.push(courseTitleMap.get(cid)!)
        }
      }
      if (papers.length === 0) {
        const rawSel = reg.selections
        const list = Array.isArray(rawSel) ? rawSel : Array.isArray(rawSel?.courses) ? rawSel.courses : []
        for (const item of list) {
          const cid = typeof item === 'string' ? item : item?.id || item?.course_id
          const title = item?.title || (cid ? courseTitleMap.get(cid) : '')
          if (title) papers.push(title)
        }
      }

      return {
        name: student?.full_name ?? '—',
        sem: reg.semester,
        paper_1: papers[0] ?? '',
        paper_2: papers[1] ?? '',
        paper_3: papers[2] ?? '',
        paper_4: papers[3] ?? '',
        paper_5: papers[4] ?? '',
        paper_6: papers[5] ?? '',
      }
    })

    return rows
  }

  // ──────────────── Teachers Management ────────────────
  async getDepartmentTeachers(user: AuthUser) {
    const departmentId = user.department_id
    if (!departmentId) {
      throw new ForbiddenException('User is not affiliated with any academic department.')
    }

    const { data, error } = await this.supabase.admin
      .from('faculty')
      .select('id, full_name, email, role, created_at')
      .eq('department_id', departmentId)
      .in('role', ['teacher', 'teaching_staff'])
      .order('full_name', { ascending: true })

    if (error) {
      throw new InternalServerErrorException(`Failed to fetch teachers: ${error.message}`)
    }

    return data || []
  }

  async createDepartmentTeacher(
    body: { full_name: string; email: string; password: string },
    user: AuthUser,
  ) {
    const departmentId = user.department_id
    const campusId = user.campus_id
    if (!departmentId || !campusId) {
      throw new ForbiddenException('User is missing department or campus affiliation.')
    }

    const { full_name, email, password } = body

    // 1. Create auth user with Supabase admin API
    const { data: authData, error: authError } = await this.supabase.admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError || !authData?.user) {
      const isDuplicate = authError?.message?.toLowerCase().includes('already') || authError?.status === 422
      throw new BadRequestException(
        isDuplicate ? 'A user with this email address has already been registered' : 'Failed to create auth account: ' + authError?.message,
      )
    }

    const teacherId = authData.user.id

    // 2. Insert into faculty table with role 'teacher'
    const { error: facultyError } = await this.supabase.admin
      .from('faculty')
      .insert({
        id: teacherId,
        full_name,
        email,
        role: 'teacher',
        department_id: departmentId,
        campus_id: campusId,
      })

    if (facultyError) {
      await this.supabase.admin.auth.admin.deleteUser(teacherId)
      throw new BadRequestException('Failed to create faculty record: ' + facultyError.message)
    }

    // 3. Set app_metadata
    await this.supabase.admin.auth.admin.updateUserById(teacherId, {
      app_metadata: {
        role: 'teacher',
        department_id: departmentId,
        campus_id: campusId,
      },
    })

    await this.auditLogger.log({
      eventType: 'teacher_created',
      userId: user.userId,
      userRole: user.role,
      action: `Created department teacher: ${full_name} (${email})`,
      resourceType: 'faculty',
      resourceId: teacherId,
      status: 'success',
    })

    return {
      success: true,
      message: `Teacher ${full_name} added successfully to your department.`,
      teacher: {
        id: teacherId,
        full_name,
        email,
        role: 'teacher',
      },
    }
  }

  async deleteDepartmentTeacher(teacherId: string, user: AuthUser) {
    const departmentId = user.department_id
    if (!departmentId) {
      throw new ForbiddenException('User is missing department affiliation.')
    }

    // Verify teacher belongs to this department and is NOT HOD
    const { data: teacher, error: findError } = await this.supabase.admin
      .from('faculty')
      .select('id, full_name, role, department_id')
      .eq('id', teacherId)
      .single()

    if (findError || !teacher) {
      throw new NotFoundException('Teacher not found.')
    }

    if (teacher.department_id !== departmentId) {
      throw new ForbiddenException('Cannot remove a teacher from another department.')
    }

    if (teacher.role === 'hod') {
      throw new BadRequestException('Cannot remove department Head of Department.')
    }

    // Delete any course assignments first
    await this.supabase.admin
      .from('teacher_course_assignments')
      .delete()
      .eq('teacher_id', teacherId)

    // Delete from faculty table
    const { error: deleteFacultyError } = await this.supabase.admin
      .from('faculty')
      .delete()
      .eq('id', teacherId)

    if (deleteFacultyError) {
      throw new InternalServerErrorException(`Failed to delete teacher record: ${deleteFacultyError.message}`)
    }

    // Delete auth account
    await this.supabase.admin.auth.admin.deleteUser(teacherId)

    await this.auditLogger.log({
      eventType: 'teacher_deleted',
      userId: user.userId,
      userRole: user.role,
      action: `Deleted department teacher: ${teacher.full_name} (${teacherId})`,
      resourceType: 'faculty',
      resourceId: teacherId,
      status: 'success',
    })

    return {
      success: true,
      message: `Teacher ${teacher.full_name} removed successfully.`,
    }
  }
}
