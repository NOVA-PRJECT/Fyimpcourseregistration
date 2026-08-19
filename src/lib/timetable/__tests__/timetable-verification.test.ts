import { describe, it, expect } from 'vitest';
import { generateTimetable } from '../generator';
import { sanitizeJobErrorMessage } from '../job';
import { CourseNode, SlotId } from '../types';

function buildSyntheticSlotMap(): Map<number, Map<number, SlotId>> {
  const slotMap = new Map<number, Map<number, SlotId>>();
  for (let day = 1; day <= 5; day++) {
    const dayMap = new Map<number, SlotId>();
    for (let p = 1; p <= 6; p++) {
      dayMap.set(p, `slot-${day}-${p}`);
    }
    slotMap.set(day, dayMap);
  }
  return slotMap;
}

function createCourse(
  courseId: string,
  departmentId: string,
  hoursPerWeek: number,
  isLab: boolean,
  studentIds: string[],
  isCrossDept: boolean = false
): CourseNode {
  return {
    courseId,
    departmentId,
    hoursPerWeek,
    isLab,
    remainingHours: hoursPerWeek,
    isCrossDept,
    studentIds: new Set(studentIds),
    conflictsWith: new Set<string>(),
  };
}

describe('Timetable System End-to-End Verification', () => {
  describe('1. Error Sanitization Verification', () => {
    it('sanitizes raw PostgreSQL relation error into user-friendly message', () => {
      const rawError = new Error('ERROR: 42P01: relation "timetable_entries" does not exist');
      const sanitized = sanitizeJobErrorMessage(rawError);
      expect(sanitized).toBe('Database processing error occurred during timetable generation. Please try again or contact system support.');
      expect(sanitized).not.toContain('42P01');
      expect(sanitized).not.toContain('timetable_entries');
    });

    it('sanitizes RLS permission denied error into user-friendly message', () => {
      const rawError = new Error('new row violates row-level security policy for table "timetable_generation_jobs"');
      const sanitized = sanitizeJobErrorMessage(rawError);
      expect(sanitized).toBe('Access control restriction prevented schedule generation. Please refresh your session and try again.');
      expect(sanitized).not.toContain('violates row-level security');
    });

    it('preserves clear domain registration error message', () => {
      const domainError = new Error('No approved student registrations found for this semester. Ensure students have registered for courses and HODs have approved them.');
      const sanitized = sanitizeJobErrorMessage(domainError);
      expect(sanitized).toContain('No approved student registrations found');
    });

    it('preserves time slot configuration error message', () => {
      const slotError = new Error('System time slot configurations are missing. Please contact system support.');
      const sanitized = sanitizeJobErrorMessage(slotError);
      expect(sanitized).toContain('System time slot configurations are missing');
    });
  });

  describe('2. Timetable Generator Algorithm Verification', () => {
    it('schedules multi-department courses with lab blocks and 0 conflicts', () => {
      const slotMap = buildSyntheticSlotMap();
      const courses = [
        createCourse('CS101', 'dept_cs', 3, false, ['s1', 's2', 's3']),
        createCourse('CS102_LAB', 'dept_cs', 2, true, ['s1', 's2']),
        createCourse('EC201', 'dept_ec', 4, false, ['s4', 's5']),
        createCourse('MATH301', 'dept_cs', 3, false, ['s1', 's4'], true), // Cross-dept
      ];

      const result = generateTimetable(courses, slotMap);

      expect(result.conflicts).toHaveLength(0);
      expect(result.assignments.length).toBeGreaterThan(0);

      // Verify lab block continuous assignment
      const labAssignments = result.assignments.filter(a => a.courseId === 'CS102_LAB');
      expect(labAssignments).toHaveLength(2);
      expect(labAssignments[0].isLabBlock).toBe(true);

      const period1 = parseInt(labAssignments[0].timeSlotId.split('-')[2]);
      const period2 = parseInt(labAssignments[1].timeSlotId.split('-')[2]);
      expect(Math.abs(period1 - period2)).toBe(1);
    });

    it('provides explicit explanatory reasons when scheduling conflicts occur', () => {
      const slotMap = buildSyntheticSlotMap();
      const courses: CourseNode[] = [];

      // Create 32 1-hour courses sharing student 'shared_student' (only 30 slots available)
      for (let i = 1; i <= 32; i++) {
        courses.push(createCourse(`COURSE_${i}`, 'dept_1', 1, false, ['shared_student']));
      }

      const result = generateTimetable(courses, slotMap);

      expect(result.conflicts.length).toBeGreaterThan(0);
      const conflict = result.conflicts[0];
      expect(conflict.reason).toContain('Could not allocate');
      expect(conflict.reason).toContain('because');
      expect(conflict.conflictingStudentCount).toBeGreaterThan(0);
    });

    it('ensures no student has overlapping classes assigned at the same slot', () => {
      const slotMap = buildSyntheticSlotMap();
      const courses = [
        createCourse('C1', 'dept1', 5, false, ['student_x']),
        createCourse('C2', 'dept1', 5, false, ['student_x']),
        createCourse('C3', 'dept1', 5, false, ['student_x']),
      ];

      const result = generateTimetable(courses, slotMap);
      expect(result.conflicts).toHaveLength(0);

      const assignedSlots = result.assignments.map(a => a.timeSlotId);
      const uniqueSlots = new Set(assignedSlots);
      expect(assignedSlots.length).toEqual(uniqueSlots.size); // All assigned slots for student_x are distinct
    });
  });
});
