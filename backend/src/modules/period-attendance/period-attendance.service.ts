import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from '../../core/database/supabase.service';
import { AuditLoggerService } from '../../core/logging/audit-logger.service';
import { AuthUser } from '../../core/auth/types';
import { PERIOD_GRACE_MINUTES } from './period-attendance.constants';

@Injectable()
export class PeriodAttendanceService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly auditLogger: AuditLoggerService
  ) {}

  /**
   * Helper to convert time string (HH:MM:SS or HH:MM) to minutes from midnight.
   */
  private timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map((v) => parseInt(v, 10));
    return hours * 60 + (minutes || 0);
  }

  /**
   * Auto-detects current active period (running or ended <= 15 min ago)
   * for the authenticated teacher.
   */
  async getCurrentPeriod(user: AuthUser) {
    // 1. Fetch teacher's assigned courses
    const { data: assignments, error: assignError } = await this.supabase.admin
      .from('teacher_course_assignments')
      .select('course_id')
      .eq('teacher_id', user.userId);

    if (assignError) {
      throw new InternalServerErrorException(`Failed to check assignments: ${assignError.message}`);
    }

    if (!assignments || assignments.length === 0) {
      return {
        active_slots: [],
        next_slot: null,
        message: 'No courses currently assigned to you. Contact your HOD.',
      };
    }

    const assignedCourseIds = assignments.map((a) => a.course_id);

    // 2. Determine today's day of week (1=Monday ... 6=Saturday)
    const now = new Date();
    let dayOfWeek = now.getDay(); // 0 is Sunday
    if (dayOfWeek === 0) dayOfWeek = 7; // Treat Sunday as 7

    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // 3. Fetch timetable entries for teacher's courses
    const { data: entries, error: entriesError } = await this.supabase.admin
      .from('timetable_entries')
      .select(`
        id,
        course_id,
        department_id,
        session_type,
        courses(id, course_code, title),
        time_slots(id, day_of_week, period_number, start_time, end_time)
      `)
      .in('course_id', assignedCourseIds)
      .eq('status', 'published');

    if (entriesError) {
      throw new InternalServerErrorException(`Failed to fetch timetable entries: ${entriesError.message}`);
    }

    const todayEntries = (entries || []).filter(
      (e: any) => e.time_slots?.day_of_week === dayOfWeek
    );

    // 4. Find slots that are currently active or ended within grace window (15 minutes)
    const activeSlots: any[] = [];
    let nextUpcomingSlot: any = null;
    let minUpcomingDiff = Infinity;

    for (const entry of todayEntries) {
      const slot = (entry as any).time_slots;
      if (!slot) continue;

      const startMin = this.timeToMinutes(slot.start_time);
      const endMin = this.timeToMinutes(slot.end_time);
      const allowedUntilMin = endMin + PERIOD_GRACE_MINUTES;

      // Check if slot is running or within 15-min post-period window
      if (currentMinutes >= startMin && currentMinutes <= allowedUntilMin) {
        // Fetch roster for this course
        const roster = await this.getEnrolledRoster(entry.course_id);

        // Check if already marked
        const { data: existingMarks } = await this.supabase.admin
          .from('period_attendance')
          .select('student_id, status, marked_at')
          .eq('timetable_slot_id', entry.id);

        const markedMap = new Map((existingMarks || []).map((m) => [m.student_id, m.status]));
        const isMarked = (existingMarks || []).length > 0;

        activeSlots.push({
          timetable_slot_id: entry.id,
          course_id: entry.course_id,
          course_code: (entry as any).courses?.course_code,
          course_title: (entry as any).courses?.title,
          period_number: slot.period_number,
          start_time: slot.start_time,
          end_time: slot.end_time,
          is_marked: isMarked,
          roster: roster.map((s) => ({
            ...s,
            status: markedMap.get(s.id) || 'present', // Default to present
          })),
        });
      } else if (startMin > currentMinutes) {
        const diff = startMin - currentMinutes;
        if (diff < minUpcomingDiff) {
          minUpcomingDiff = diff;
          nextUpcomingSlot = {
            course_code: (entry as any).courses?.course_code,
            course_title: (entry as any).courses?.title,
            start_time: slot.start_time,
            end_time: slot.end_time,
            period_number: slot.period_number,
          };
        }
      }
    }

    return {
      active_slots: activeSlots,
      next_slot: nextUpcomingSlot,
      message:
        activeSlots.length === 0
          ? 'No active lecture period right now.'
          : `${activeSlots.length} lecture period ready for attendance marking.`,
    };
  }

  /**
   * Helper to retrieve all enrolled students for a specific course.
   */
  async getEnrolledRoster(courseId: string) {
    // Supports both flat slot columns (slot_1_course_id..slot_6_course_id) and JSONB selections
    const { data: registrations, error: regError } = await this.supabase.admin
      .from('student_registrations')
      .select('student_id')
      .or(
        `slot_1_course_id.eq.${courseId},slot_2_course_id.eq.${courseId},slot_3_course_id.eq.${courseId},slot_4_course_id.eq.${courseId},slot_5_course_id.eq.${courseId},slot_6_course_id.eq.${courseId}`
      );

    if (regError) {
      throw new InternalServerErrorException(`Failed to fetch student registrations: ${regError.message}`);
    }

    const studentIds = Array.from(new Set((registrations || []).map((r) => r.student_id)));
    if (studentIds.length === 0) return [];

    const { data: students, error: studentError } = await this.supabase.admin
      .from('students')
      .select('id, full_name, cap_application_number, current_semester')
      .in('id', studentIds)
      .order('full_name', { ascending: true });

    if (studentError) {
      throw new InternalServerErrorException(`Failed to fetch student profiles: ${studentError.message}`);
    }

    return students || [];
  }

  /**
   * Submits period attendance marks using default-present, tap-exceptions (absents) pattern.
   * Enforces 15-minute grace window or valid HOD unlock record.
   */
  async submitAttendance(
    user: AuthUser,
    slotId: string,
    absentStudentIds: string[],
    ip: string,
    clientTimestamp?: string
  ) {
    // 1. Fetch timetable entry and slot times
    const { data: entry, error: entryError } = await this.supabase.admin
      .from('timetable_entries')
      .select(`
        id,
        course_id,
        department_id,
        courses(title, course_code),
        time_slots(day_of_week, start_time, end_time)
      `)
      .eq('id', slotId)
      .maybeSingle();

    if (entryError || !entry) {
      throw new NotFoundException('Timetable slot not found.');
    }

    const courseId = entry.course_id;

    // 2. Validate teacher is assigned to this course
    const { data: assignment, error: assignError } = await this.supabase.admin
      .from('teacher_course_assignments')
      .select('id')
      .eq('teacher_id', user.userId)
      .eq('course_id', courseId)
      .maybeSingle();

    if (assignError || !assignment) {
      throw new ForbiddenException('You are not assigned to instruct this course.');
    }

    // 3. Timing validation: 15-minute grace window or HOD unlock record
    const slot = (entry as any).time_slots;
    let isLateEntry = false;
    let unlockedBy: string | null = null;

    if (slot) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const endMin = this.timeToMinutes(slot.end_time);
      const graceLimitMin = endMin + PERIOD_GRACE_MINUTES;

      const isPastGrace = currentMinutes > graceLimitMin;

      if (isPastGrace) {
        // Look for HOD unlock record
        const { data: unlockRecord } = await this.supabase.admin
          .from('period_unlock_requests')
          .select('id, unlocked_by, unlocked_at')
          .eq('timetable_slot_id', slotId)
          .order('unlocked_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!unlockRecord) {
          throw new ForbiddenException(
            `The 15-minute marking window for this period ended at ${slot.end_time}. An HOD unlock is required to submit late attendance.`
          );
        }

        isLateEntry = true;
        unlockedBy = unlockRecord.unlocked_by;
      }
    }

    // 4. Fetch all enrolled students
    const roster = await this.getEnrolledRoster(courseId);
    if (roster.length === 0) {
      throw new NotFoundException('No enrolled students found for this course.');
    }

    const absentSet = new Set(absentStudentIds);
    const submissionTime = clientTimestamp || new Date().toISOString();

    // 5. Construct rows with default-present pattern
    const rows = roster.map((student) => ({
      timetable_slot_id: slotId,
      student_id: student.id,
      course_id: courseId,
      marked_by: user.userId,
      status: absentSet.has(student.id) ? 'absent' : 'present',
      marked_at: submissionTime,
      is_late_entry: isLateEntry,
      unlocked_by: unlockedBy,
    }));

    // 6. Bulk upsert rows in single atomic operation
    const { error: upsertError } = await this.supabase.admin
      .from('period_attendance')
      .upsert(rows, { onConflict: 'timetable_slot_id,student_id' });

    if (upsertError) {
      throw new InternalServerErrorException(`Failed to record attendance: ${upsertError.message}`);
    }

    await this.auditLogger.log({
      eventType: 'period_attendance_marked',
      userId: user.userId,
      userRole: user.role,
      action: `marked period attendance for slot ${slotId} (${absentStudentIds.length} absent, ${rows.length - absentStudentIds.length} present)`,
      resourceType: 'period_attendance',
      resourceId: slotId,
      status: 'success',
      ipAddress: ip,
      metadata: {
        is_late_entry: isLateEntry,
        unlocked_by: unlockedBy,
      },
    });

    return {
      success: true,
      total_students: roster.length,
      present_count: rows.length - absentStudentIds.length,
      absent_count: absentStudentIds.length,
      is_late_entry: isLateEntry,
    };
  }

  /**
   * HOD authorizes an unlock for a past period slot to permit late attendance entry.
   */
  async unlockPeriod(user: AuthUser, slotId: string, reason: string, ip: string) {
    // 1. Verify slot belongs to HOD's department
    const { data: entry, error: entryError } = await this.supabase.admin
      .from('timetable_entries')
      .select('id, department_id, courses(course_code, title)')
      .eq('id', slotId)
      .maybeSingle();

    if (entryError || !entry) {
      throw new NotFoundException('Timetable slot not found.');
    }

    if (entry.department_id !== user.department_id) {
      throw new ForbiddenException('Cannot unlock slots belonging to another department.');
    }

    const unlockedAt = new Date().toISOString();

    // 2. Insert audit unlock record
    const { data, error } = await this.supabase.admin
      .from('period_unlock_requests')
      .insert({
        timetable_slot_id: slotId,
        unlocked_by: user.userId,
        unlocked_at: unlockedAt,
        reason: reason.trim(),
      })
      .select()
      .single();

    if (error) {
      throw new InternalServerErrorException(`Failed to unlock period: ${error.message}`);
    }

    await this.auditLogger.log({
      eventType: 'period_marking_unlocked',
      userId: user.userId,
      userRole: user.role,
      action: `HOD unlocked period slot ${slotId} for late entry`,
      resourceType: 'period_unlock_request',
      resourceId: data.id,
      status: 'success',
      ipAddress: ip,
      metadata: { reason },
    });

    return {
      success: true,
      unlock_record: data,
    };
  }

  /**
   * HOD queries student roster and marked status for a specific slot.
   */
  async getSlotRosterForHod(user: AuthUser, slotId: string) {
    const { data: entry, error: entryError } = await this.supabase.admin
      .from('timetable_entries')
      .select(`
        id,
        course_id,
        department_id,
        courses(title, course_code),
        time_slots(day_of_week, period_number, start_time, end_time)
      `)
      .eq('id', slotId)
      .maybeSingle();

    if (entryError || !entry) {
      throw new NotFoundException('Timetable slot not found.');
    }

    if (entry.department_id !== user.department_id) {
      throw new ForbiddenException('Cannot access attendance data for another department.');
    }

    const roster = await this.getEnrolledRoster(entry.course_id);

    // Fetch marks for this slot
    const { data: marks } = await this.supabase.admin
      .from('period_attendance')
      .select('student_id, status, marked_at, is_late_entry, marked_by')
      .eq('timetable_slot_id', slotId);

    const markMap = new Map((marks || []).map((m) => [m.student_id, m]));

    const rosterWithMarks = roster.map((student) => {
      const mark = markMap.get(student.id);
      return {
        ...student,
        status: mark?.status || 'unmarked',
        marked_at: mark?.marked_at || null,
        is_late_entry: mark?.is_late_entry || false,
      };
    });

    const totalEnrolled = roster.length;
    const presentCount = (marks || []).filter((m) => m.status === 'present').length;
    const absentCount = (marks || []).filter((m) => m.status === 'absent').length;
    const isMarked = (marks || []).length > 0;

    return {
      slot: {
        id: entry.id,
        course_id: entry.course_id,
        course_code: (entry as any).courses?.course_code,
        course_title: (entry as any).courses?.title,
        period_number: (entry as any).time_slots?.period_number,
        start_time: (entry as any).time_slots?.start_time,
        end_time: (entry as any).time_slots?.end_time,
      },
      summary: {
        total_enrolled: totalEnrolled,
        present_count: presentCount,
        absent_count: absentCount,
        is_marked: isMarked,
      },
      students: rosterWithMarks,
    };
  }

  /**
   * Returns all timetable slots for the HOD's department, optionally filtered by semester and day.
   */
  async getDepartmentSlots(user: AuthUser, semester?: number, dayOfWeek?: number) {
    if (!user.department_id) {
      throw new ForbiddenException('User is not associated with a department.');
    }

    let query = this.supabase.admin
      .from('timetable_entries')
      .select(`
        id,
        course_id,
        department_id,
        session_type,
        courses!inner(id, course_code, title, semester),
        time_slots!inner(id, day_of_week, period_number, start_time, end_time)
      `)
      .eq('department_id', user.department_id)
      .eq('status', 'published');

    if (semester) {
      query = query.eq('courses.semester', semester);
    }
    if (dayOfWeek) {
      query = query.eq('time_slots.day_of_week', dayOfWeek);
    }

    const { data: entries, error } = await query;
    if (error) {
      throw new InternalServerErrorException(`Failed to fetch department slots: ${error.message}`);
    }

    const entryIds = (entries || []).map((e) => e.id);
    let marks: any[] = [];
    let unlocks: any[] = [];

    if (entryIds.length > 0) {
      const { data: markData } = await this.supabase.admin
        .from('period_attendance')
        .select('timetable_slot_id, status')
        .in('timetable_slot_id', entryIds);
      marks = markData || [];

      const { data: unlockData } = await this.supabase.admin
        .from('period_unlock_requests')
        .select('timetable_slot_id, unlocked_at, reason')
        .in('timetable_slot_id', entryIds);
      unlocks = unlockData || [];
    }

    const unlocksMap = new Map(unlocks.map((u) => [u.timetable_slot_id, u]));

    const result = (entries || []).map((entry) => {
      const slotMarks = marks.filter((m) => m.timetable_slot_id === entry.id);
      const isMarked = slotMarks.length > 0;
      const presentCount = slotMarks.filter((m) => m.status === 'present').length;
      const absentCount = slotMarks.filter((m) => m.status === 'absent').length;
      const unlockInfo = unlocksMap.get(entry.id);

      return {
        id: entry.id,
        course_id: entry.course_id,
        course_code: (entry as any).courses?.course_code,
        course_title: (entry as any).courses?.title,
        semester: (entry as any).courses?.semester,
        session_type: entry.session_type,
        day_of_week: (entry as any).time_slots?.day_of_week,
        period_number: (entry as any).time_slots?.period_number,
        start_time: (entry as any).time_slots?.start_time,
        end_time: (entry as any).time_slots?.end_time,
        is_marked: isMarked,
        present_count: presentCount,
        absent_count: absentCount,
        is_unlocked: !!unlockInfo,
        unlocked_at: unlockInfo?.unlocked_at || null,
        unlock_reason: unlockInfo?.reason || null,
      };
    });

    return result;
  }
}
