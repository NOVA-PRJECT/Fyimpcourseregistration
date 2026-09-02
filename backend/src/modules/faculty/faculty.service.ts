import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common'
import { SupabaseService } from '../../core/database/supabase.service'
import { ServerLoggerService } from '../../core/logging/server-logger.service'
import { AuthUser } from '../../core/auth/types'

@Injectable()
export class FacultyService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly serverLogger: ServerLoggerService,
  ) {}

  async getCourses(user: AuthUser) {
    const { data: faculty } = await this.supabase.admin
      .from('faculty')
      .select('full_name')
      .eq('id', user.userId)
      .single()

    const { data: depts } = await this.supabase.admin
      .from('departments')
      .select('id, name, code')
      .eq('campus_id', user.campus_id)
      .order('name')

    const deptIds = (depts ?? []).map((d) => d.id)

    const { data: courseList } = await this.supabase.admin
      .from('courses')
      .select('id, course_code, title, semester, department_id')
      .in('department_id', deptIds)
      .order('title')

    const { data: campusSettings } = await this.supabase.admin
      .from('campus_settings')
      .select('academic_year')
      .eq('campus_id', user.campus_id)
      .single()

    const academicYear = campusSettings?.academic_year ?? ''
    const enrolledCounts: Record<string, number> = {}

    if (academicYear) {
      const { data: registrations } = await this.supabase.admin
        .from('student_registrations')
        .select(`
          slot_1_course_id,
          slot_2_course_id,
          slot_3_course_id,
          slot_4_course_id,
          slot_5_course_id,
          slot_6_course_id
        `)
        .eq('academic_year', academicYear)

      if (registrations) {
        for (const reg of registrations) {
          const slots = [
            reg.slot_1_course_id,
            reg.slot_2_course_id,
            reg.slot_3_course_id,
            reg.slot_4_course_id,
            reg.slot_5_course_id,
            reg.slot_6_course_id,
          ]
          for (const cid of slots) {
            if (cid) {
              enrolledCounts[cid] = (enrolledCounts[cid] || 0) + 1
            }
          }
        }
      }
    }

    const coursesWithCounts = (courseList ?? []).map((course) => ({
      ...course,
      enrolled_count: enrolledCounts[course.id] || 0,
    }))

    return {
      teacherName: faculty?.full_name ?? '',
      departments: depts ?? [],
      courses: coursesWithCounts,
    }
  }

  async getClassRoster(courseId: string, user: AuthUser) {
    const campus_id = user.campus_id
    if (!campus_id) throw new BadRequestException('Campus ID missing')

    const { data: campusSettings } = await this.supabase.admin
      .from('campus_settings')
      .select('academic_year')
      .eq('campus_id', campus_id)
      .single()

    const academicYear = campusSettings?.academic_year ?? ''

    const { data: course, error: courseError } = await this.supabase.admin
      .from('courses')
      .select('id, title, course_code, department_id')
      .eq('id', courseId)
      .single()

    if (courseError || !course) {
      throw new NotFoundException('Course not found')
    }

    const { data: courseDept } = await this.supabase.admin
      .from('departments')
      .select('campus_id')
      .eq('id', course.department_id)
      .single()

    if (!courseDept || courseDept.campus_id !== campus_id) {
      throw new ForbiddenException('Course does not belong to your campus')
    }

    const slotFields = [
      'slot_1_course_id',
      'slot_2_course_id',
      'slot_3_course_id',
      'slot_4_course_id',
      'slot_5_course_id',
      'slot_6_course_id',
    ]
    const orClause = slotFields.map((field) => `${field}.eq.${courseId}`).join(',')

    const { data: registrations, error: regError } = await this.supabase.admin
      .from('student_registrations')
      .select(`
        student_id,
        pathway_id,
        slot_1_course_id,
        slot_2_course_id,
        slot_3_course_id,
        slot_4_course_id,
        slot_5_course_id,
        slot_6_course_id
      `)
      .eq('academic_year', academicYear)
      .or(orClause)

    if (regError) {
      throw new InternalServerErrorException('Failed to fetch registrations')
    }

    if (!registrations || registrations.length === 0) {
      return {
        course,
        total_students: 0,
        department_breakdown: {},
        students: [],
      }
    }

    const studentIds = registrations.map((r: any) => r.student_id)
    const studentPathwayMap = new Map(
      registrations.map((r: any) => [r.student_id, r.pathway_id ?? null]),
    )

    const { data: students, error: studentError } = await this.supabase.admin
      .from('students')
      .select('id, full_name, departments (name, code)')
      .in('id', studentIds)

    if (studentError || !students) {
      throw new InternalServerErrorException('Failed to fetch student details')
    }

    const departmentBreakdown: Record<string, number> = {}
    students.forEach((student: any) => {
      const deptName = student.departments?.name ?? 'Unknown'
      departmentBreakdown[deptName] = (departmentBreakdown[deptName] ?? 0) + 1
    })

    const roster = students.map((student: any) => ({
      id: student.id,
      full_name: student.full_name,
      department: student.departments?.name ?? 'Unknown',
      department_code: student.departments?.code ?? '',
      pathway: studentPathwayMap.get(student.id) ?? 'Default',
    }))

    roster.sort((a, b) => {
      const deptA = (a.department_code || a.department).toUpperCase()
      const deptB = (b.department_code || b.department).toUpperCase()
      if (deptA !== deptB) return deptA.localeCompare(deptB)
      return a.full_name.localeCompare(b.full_name)
    })

    return {
      course,
      total_students: roster.length,
      department_breakdown: departmentBreakdown,
      students: roster,
    }
  }

  async getDefaulters(semester: number | undefined, user: AuthUser) {
    const campusId = user.campus_id
    const departmentId = user.department_id

    if (!campusId || !departmentId) {
      throw new BadRequestException('Campus or department assignment missing')
    }

    let studentsQuery = this.supabase.admin
      .from('students')
      .select('id, full_name, current_semester')
      .eq('department_id', departmentId)
      .eq('campus_id', campusId)
      .order('current_semester', { ascending: true })
      .order('full_name', { ascending: true })

    if (semester !== undefined) {
      studentsQuery = studentsQuery.eq('current_semester', semester)
    }

    console.log('[DEBUG getDefaulters ENTRY]', {
      userId: user.userId,
      email: user.email,
      role: user.role,
      campusId,
      departmentId,
      semester,
    })

    const [settingsRes, studentsRes] = await Promise.all([
      this.supabase.admin
        .from('campus_settings')
        .select('academic_year')
        .eq('campus_id', campusId)
        .maybeSingle(),
      studentsQuery,
    ])

    console.log('[DEBUG getDefaulters RESULTS]', {
      settingsData: settingsRes.data,
      settingsError: settingsRes.error,
      studentsCount: studentsRes.data?.length,
      studentsError: studentsRes.error,
    })

    let academicYear = settingsRes.data?.academic_year
    if (!academicYear) {
      const { data: win } = await this.supabase.admin
        .from('registration_windows')
        .select('academic_year')
        .eq('campus_id', campusId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      academicYear = win?.academic_year || '2026-27'
    }

    const students = studentsRes.data ?? []

    if (students.length === 0) {
      return {
        academic_year: academicYear,
        total_students: 0,
        submitted_count: 0,
        students: [],
      }
    }

    // Query registrations for these students (without overly strict academic_year filtering)
    let regQuery = this.supabase.admin
      .from('student_registrations')
      .select('student_id, semester, academic_year, submitted_at, slot_1_course_id')
      .in(
        'student_id',
        students.map((s: any) => s.id),
      )

    const { data: registrations, error: regError } = await regQuery

    if (regError) {
      console.error('[Defaulters regQuery error]', regError)
    }

    // A registration is valid if submitted_at is set or slot_1 is filled
    const validRegistrations = (registrations ?? []).filter((r: any) => {
      return r.submitted_at != null || r.slot_1_course_id != null
    })

    const submittedSet = new Set(validRegistrations.map((r: any) => `${r.student_id}:${r.semester}`))

    const enriched = students.map((s: any) => {
      const targetSem = semester !== undefined ? semester : s.current_semester
      const isSubmitted = submittedSet.has(`${s.id}:${targetSem}`) || submittedSet.has(`${s.id}:${s.current_semester}`)
      return {
        id: s.id,
        full_name: s.full_name,
        current_semester: s.current_semester,
        submitted: isSubmitted,
      }
    })

    const submittedCount = enriched.filter((s: any) => s.submitted).length

    return {
      academic_year: academicYear,
      total_students: enriched.length,
      submitted_count: submittedCount,
      students: enriched,
    }
  }
}
