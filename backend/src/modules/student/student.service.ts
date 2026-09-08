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
      .select(`
        id,
        semester,
        academic_year,
        pathway_id,
        total_credits,
        slot_1_course_id,
        slot_2_course_id,
        slot_3_course_id,
        slot_4_course_id,
        slot_5_course_id,
        slot_6_course_id,
        allocation_metadata,
        preferences,
        selections
      `)
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

    // Resolve enrolled / allocated courses
    const enrolledCourses: any[] = []
    let totalRegisteredCredits = 0

    if (reg) {
      const courseIdsToFetch = new Set<string>()
      const slotCourseMap = new Map<number, { courseId: string; status: string; isConfirmed: boolean }>()

      const meta = (reg as any).allocation_metadata || {}
      const prefs = (reg as any).preferences || {}

      for (let s = 1; s <= 6; s++) {
        const slotKey = `slot_${s}`
        const cid = (reg as any)[`${slotKey}_course_id`]
        const slotMeta = meta[slotKey]
        const slotPrefs = prefs[slotKey]

        if (cid) {
          courseIdsToFetch.add(cid)
          let statusText = 'Confirmed Enrolled'
          if (slotMeta?.allocated_by === 'fixed') statusText = 'Core Fixed'
          else if (slotMeta?.allocated_by === 'algorithm') statusText = 'Allocated by Algorithm'
          else if (slotMeta?.allocated_by === 'hod') statusText = 'Allocated by HOD'

          slotCourseMap.set(s, { courseId: cid, status: statusText, isConfirmed: true })
        } else if (Array.isArray(slotPrefs) && slotPrefs.length > 0) {
          // Preference submitted, pending allocation
          const rank1Id = slotPrefs.find((p: any) => p.rank === 1)?.course_id
          if (rank1Id) {
            courseIdsToFetch.add(rank1Id)
            slotCourseMap.set(s, { courseId: rank1Id, status: 'Preference Choice 1 (Pending)', isConfirmed: false })
          }
        }
      }

      // If flat slots were empty, check selections JSONB
      if (courseIdsToFetch.size === 0 && (reg as any).selections) {
        const rawSel = (reg as any).selections
        const list = Array.isArray(rawSel) ? rawSel : Array.isArray(rawSel?.courses) ? rawSel.courses : []
        let idx = 1
        for (const item of list) {
          const cid = typeof item === 'string' ? item : item?.id || item?.course_id
          if (cid) {
            courseIdsToFetch.add(cid)
            slotCourseMap.set(idx, { courseId: cid, status: 'Enrolled Paper', isConfirmed: true })
            idx++
          }
        }
      }

      if (courseIdsToFetch.size > 0) {
        const { data: courses } = await this.supabase.admin
          .from('courses')
          .select(`
            id,
            course_code,
            title,
            credits,
            category,
            department_id,
            departments ( name )
          `)
          .in('id', Array.from(courseIdsToFetch))

        const courseDetailsMap = new Map((courses || []).map((c: any) => [c.id, c]))

        for (const [slotNum, slotInfo] of slotCourseMap.entries()) {
          const c = courseDetailsMap.get(slotInfo.courseId)
          if (c) {
            const cr = Number(c.credits) || 0
            totalRegisteredCredits += cr
            enrolledCourses.push({
              slotNumber: slotNum,
              id: c.id,
              courseCode: c.course_code,
              title: c.title,
              credits: cr,
              category: c.category || 'General',
              departmentName: (c.departments as any)?.name || 'General',
              status: slotInfo.status,
              isConfirmed: slotInfo.isConfirmed,
            })
          }
        }

        enrolledCourses.sort((a, b) => a.slotNumber - b.slotNumber)
      }
    }

    return {
      studentInfo,
      hasSubmission: !!reg,
      must_change_password: student.must_change_password,
      enrolledCourses,
      totalRegisteredCredits: totalRegisteredCredits || (reg ? Number(reg.total_credits) || 0 : 0),
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
