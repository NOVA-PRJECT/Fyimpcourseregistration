import {
  BadRequestException,
  Injectable,
  ForbiddenException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from '../../core/database/supabase.service';
import { AuditLoggerService } from '../../core/logging/audit-logger.service';
import { AuthUser } from '../../core/auth/types';

@Injectable()
export class AssignmentsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly auditLogger: AuditLoggerService
  ) {}

  /**
   * Returns all courses in the HOD's department, each with their currently assigned teachers,
   * plus the department faculty roster for selection.
   */
  async getCoursesAndAssignments(user: AuthUser) {
    const departmentId = user.department_id;
    if (!departmentId) {
      throw new ForbiddenException('User is not affiliated with any academic department.');
    }

    // 1. Fetch department courses
    const { data: courses, error: coursesError } = await this.supabase.admin
      .from('courses')
      .select('id, course_code, title, credits, category, semester')
      .eq('department_id', departmentId)
      .order('course_code', { ascending: true });

    if (coursesError) {
      throw new InternalServerErrorException(`Failed to fetch courses: ${coursesError.message}`);
    }

    // 2. Fetch all department teaching faculty (strictly excluding HOD)
    const { data: faculty, error: facultyError } = await this.supabase.admin
      .from('faculty')
      .select('id, full_name, email, role')
      .eq('department_id', departmentId)
      .in('role', ['teacher', 'teaching_staff'])
      .order('full_name', { ascending: true });

    if (facultyError) {
      throw new InternalServerErrorException(`Failed to fetch faculty: ${facultyError.message}`);
    }

    // 3. Fetch active assignments for these courses
    const courseIds = (courses || []).map((c) => c.id);
    let assignments: any[] = [];
    if (courseIds.length > 0) {
      const { data: assignData, error: assignError } = await this.supabase.admin
        .from('teacher_course_assignments')
        .select('id, teacher_id, course_id, assigned_at, assigned_by')
        .in('course_id', courseIds);

      if (assignError) {
        throw new InternalServerErrorException(`Failed to fetch assignments: ${assignError.message}`);
      }
      assignments = assignData || [];
    }

    // Map faculty by ID for rapid lookup
    const facultyMap = new Map((faculty || []).map((f) => [f.id, f]));

    // Group assigned teachers into each course
    const coursesWithTeachers = (courses || []).map((course) => {
      const courseAssignments = assignments
        .filter((a) => a.course_id === course.id)
        .map((a) => {
          const teacher = facultyMap.get(a.teacher_id);
          return {
            assignment_id: a.id,
            teacher_id: a.teacher_id,
            teacher_name: teacher?.full_name || 'Faculty Member',
            teacher_email: teacher?.email || '',
            assigned_at: a.assigned_at,
          };
        });

      return {
        ...course,
        assignments: courseAssignments,
        is_assigned: courseAssignments.length > 0,
      };
    });

    return {
      department_id: departmentId,
      courses: coursesWithTeachers,
      faculty: faculty || [],
    };
  }

  /**
   * Assigns a teacher to a course (Upsert on (teacher_id, course_id)).
   */
  async assignTeacher(user: AuthUser, teacherId: string, courseId: string, ip: string) {
    const departmentId = user.department_id;
    if (!departmentId) {
      throw new ForbiddenException('Only department HODs can assign teachers.');
    }

    // Verify course belongs to HOD's department
    const { data: course, error: courseCheckError } = await this.supabase.admin
      .from('courses')
      .select('id, department_id, title, course_code')
      .eq('id', courseId)
      .maybeSingle();

    if (courseCheckError || !course) {
      throw new NotFoundException('Course not found.');
    }

    if (course.department_id !== departmentId) {
      throw new ForbiddenException('Cannot assign teachers to courses outside your department.');
    }

    // Verify target faculty exists, belongs to HOD's department, and is strictly not HOD
    const { data: targetFaculty, error: facultyError } = await this.supabase.admin
      .from('faculty')
      .select('id, department_id, role, full_name')
      .eq('id', teacherId)
      .maybeSingle();

    if (facultyError || !targetFaculty) {
      throw new NotFoundException('Teacher faculty record not found.');
    }

    if (targetFaculty.department_id !== departmentId) {
      throw new ForbiddenException('Cannot assign faculty from another department.');
    }

    if (targetFaculty.role === 'hod') {
      throw new BadRequestException('HOD cannot be assigned as a course teacher. Please select an individual teacher or teaching staff.');
    }

    const assignedAt = new Date().toISOString();

    // Upsert into teacher_course_assignments
    const { data, error } = await this.supabase.admin
      .from('teacher_course_assignments')
      .upsert(
        {
          teacher_id: teacherId,
          course_id: courseId,
          assigned_by: user.userId,
          assigned_at: assignedAt,
        },
        { onConflict: 'teacher_id,course_id' }
      )
      .select()
      .single();

    if (error) {
      throw new InternalServerErrorException(`Failed to assign teacher: ${error.message}`);
    }

    await this.auditLogger.log({
      eventType: 'teacher_assigned',
      userId: user.userId,
      userRole: user.role,
      action: `assigned teacher ${teacherId} to course ${course.course_code}`,
      resourceType: 'course_assignment',
      resourceId: data.id,
      status: 'success',
      ipAddress: ip,
    });

    return {
      success: true,
      assignment: data,
    };
  }

  /**
   * Reassigns an existing assignment row to a new teacher mid-semester.
   */
  async reassignTeacher(user: AuthUser, assignmentId: string, newTeacherId: string, ip: string) {
    // 1. Fetch existing assignment
    const { data: existing, error: fetchError } = await this.supabase.admin
      .from('teacher_course_assignments')
      .select('id, course_id, teacher_id')
      .eq('id', assignmentId)
      .maybeSingle();

    if (fetchError || !existing) {
      throw new NotFoundException('Assignment record not found.');
    }

    const { data: course, error: courseError } = await this.supabase.admin
      .from('courses')
      .select('id, department_id, course_code')
      .eq('id', existing.course_id)
      .maybeSingle();

    if (courseError || !course) {
      throw new NotFoundException('Associated course not found.');
    }

    if (user.role === 'hod' && course.department_id !== user.department_id) {
      throw new ForbiddenException('Cannot modify assignments outside your department.');
    }

    // Verify new teacher faculty exists, belongs to HOD's department, and is strictly not HOD
    const { data: targetFaculty, error: facultyError } = await this.supabase.admin
      .from('faculty')
      .select('id, department_id, role, full_name')
      .eq('id', newTeacherId)
      .maybeSingle();

    if (facultyError || !targetFaculty) {
      throw new NotFoundException('New teacher faculty record not found.');
    }

    if (user.role === 'hod' && targetFaculty.department_id !== user.department_id) {
      throw new ForbiddenException('Cannot assign faculty from another department.');
    }

    if (targetFaculty.role === 'hod') {
      throw new BadRequestException('HOD cannot be assigned as a course teacher. Please select an individual teacher or teaching staff.');
    }

    const assignedAt = new Date().toISOString();

    // 2. Update existing row by ID (in-place replacement)
    const { data: updated, error: updateError } = await this.supabase.admin
      .from('teacher_course_assignments')
      .update({
        teacher_id: newTeacherId,
        assigned_by: user.userId,
        assigned_at: assignedAt,
      })
      .eq('id', assignmentId)
      .select()
      .single();

    if (updateError) {
      throw new InternalServerErrorException(`Failed to reassign teacher: ${updateError.message}`);
    }

    await this.auditLogger.log({
      eventType: 'teacher_reassigned',
      userId: user.userId,
      userRole: user.role,
      action: `reassigned course ${course.course_code} from ${existing.teacher_id} to ${newTeacherId}`,
      resourceType: 'course_assignment',
      resourceId: assignmentId,
      status: 'success',
      ipAddress: ip,
    });

    return {
      success: true,
      assignment: updated,
    };
  }

  /**
   * Removes a specific teacher-course assignment.
   */
  async removeAssignment(user: AuthUser, assignmentId: string, ip: string) {
    const { data: existing, error: fetchError } = await this.supabase.admin
      .from('teacher_course_assignments')
      .select('id, course_id, teacher_id')
      .eq('id', assignmentId)
      .maybeSingle();

    if (fetchError || !existing) {
      throw new NotFoundException('Assignment record not found.');
    }

    const { data: course, error: courseError } = await this.supabase.admin
      .from('courses')
      .select('id, department_id, course_code')
      .eq('id', existing.course_id)
      .maybeSingle();

    if (courseError || !course) {
      throw new NotFoundException('Associated course not found.');
    }

    if (user.role === 'hod' && course.department_id !== user.department_id) {
      throw new ForbiddenException('Cannot delete assignments outside your department.');
    }

    const { error: deleteError } = await this.supabase.admin
      .from('teacher_course_assignments')
      .delete()
      .eq('id', assignmentId);

    if (deleteError) {
      throw new InternalServerErrorException(`Failed to delete assignment: ${deleteError.message}`);
    }

    await this.auditLogger.log({
      eventType: 'teacher_assignment_removed',
      userId: user.userId,
      userRole: user.role,
      action: `removed assignment for course ${course.course_code} (${assignmentId})`,
      resourceType: 'course_assignment',
      resourceId: assignmentId,
      status: 'success',
      ipAddress: ip,
    });

    return { success: true };
  }
}
