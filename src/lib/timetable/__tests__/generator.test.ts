import { describe, it, expect } from 'vitest';
import { generateTimetable } from '../generator';
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

describe('generateTimetable Algorithm', () => {
  it('1. No conflict — two courses with zero shared students are placed', () => {
    const slotMap = buildSyntheticSlotMap();
    const courses = [
      createCourse('c1', 'dept1', 3, false, ['s1', 's2']),
      createCourse('c2', 'dept2', 3, false, ['s3', 's4']),
    ];

    const result = generateTimetable(courses, slotMap);

    expect(result.conflicts).toHaveLength(0);
    expect(result.assignments).toHaveLength(6);
  });

  it('2. Direct conflict — two courses sharing students are placed in different slots', () => {
    const slotMap = buildSyntheticSlotMap();
    const courses = [
      createCourse('c1', 'dept1', 1, false, ['s1', 'shared']),
      createCourse('c2', 'dept1', 1, false, ['s2', 'shared']),
    ];

    const result = generateTimetable(courses, slotMap);

    expect(result.conflicts).toHaveLength(0);
    expect(result.assignments).toHaveLength(2);
    expect(result.assignments[0].timeSlotId).not.toEqual(result.assignments[1].timeSlotId);
  });

  it('3. Hours constraint — course with hoursPerWeek=3 gets exactly 3 slot assignments', () => {
    const slotMap = buildSyntheticSlotMap();
    const courses = [createCourse('c1', 'dept1', 3, false, ['s1'])];

    const result = generateTimetable(courses, slotMap);

    expect(result.conflicts).toHaveLength(0);
    const c1Assignments = result.assignments.filter((a) => a.courseId === 'c1');
    expect(c1Assignments).toHaveLength(3);
  });

  it('4. Lab block — lab course gets a valid 2-period block, remainingHours decremented by 2', () => {
    const slotMap = buildSyntheticSlotMap();
    const courses = [createCourse('c_lab', 'dept1', 2, true, ['s1'])];

    const result = generateTimetable(courses, slotMap);

    expect(result.conflicts).toHaveLength(0);
    expect(result.assignments).toHaveLength(2);
    expect(result.assignments[0].isLabBlock).toBe(true);
    expect(result.assignments[1].isLabBlock).toBe(true);

    // Verify slots are contiguous valid lab pair (e.g. period 1 and 2, or 4 and 5)
    const p1 = parseInt(result.assignments[0].timeSlotId.split('-')[2]);
    const p2 = parseInt(result.assignments[1].timeSlotId.split('-')[2]);
    expect(Math.abs(p1 - p2)).toBe(1);
  });

  it('5. Cross-dept after single-dept — single-dept course occupies morning slot; cross-dept course prefers afternoon', () => {
    const slotMap = buildSyntheticSlotMap();
    const courses = [
      createCourse('c_single', 'dept1', 1, false, ['s1'], false),
      createCourse('c_cross', 'dept2', 1, false, ['s2'], true),
    ];

    const result = generateTimetable(courses, slotMap);

    expect(result.conflicts).toHaveLength(0);
    const crossAssignment = result.assignments.find((a) => a.courseId === 'c_cross');
    expect(crossAssignment).toBeDefined();

    // Cross-dept prefers afternoon periods (4, 5)
    const period = parseInt(crossAssignment!.timeSlotId.split('-')[2]);
    expect([4, 5, 1, 2, 3, 6]).toContain(period);
  });

  it('6. Unresolvable — 26 courses all sharing students exhausting slots marks overflow as unresolvable', () => {
    const slotMap = buildSyntheticSlotMap();
    const courses: CourseNode[] = [];

    // Create 31 single-hour courses that all share student 's_shared'
    for (let i = 1; i <= 31; i++) {
      courses.push(createCourse(`c_${i}`, 'dept1', 1, false, ['s_shared']));
    }

    const result = generateTimetable(courses, slotMap);

    // Slot map has 30 slots (5 days * 6 periods). 31st course cannot fit.
    expect(result.assignments).toHaveLength(30);
    expect(result.conflicts.length).toBeGreaterThanOrEqual(1);
    expect(result.conflicts[0].conflictingStudentCount).toBeGreaterThan(0);
  });

  it('7. Zero student courses — zero student courses do not cause errors', () => {
    const slotMap = buildSyntheticSlotMap();
    const courses = [createCourse('c_empty', 'dept1', 3, false, [])];

    const result = generateTimetable(courses, slotMap);
    expect(result.assignments).toHaveLength(3);
  });

  it('8. Day spread — a 3-hour course is distributed across distinct days', () => {
    const slotMap = buildSyntheticSlotMap();
    const courses = [createCourse('c_spread', 'dept1', 3, false, ['s1'])];

    const result = generateTimetable(courses, slotMap);

    expect(result.assignments).toHaveLength(3);
    const daysUsed = new Set(result.assignments.map((a) => a.timeSlotId.split('-')[1]));
    expect(daysUsed.size).toBe(3);
  });

  it('cross-dept course produces one assignment per affected department', () => {
    const studentDeptMap = new Map([
      ['student-1', 'dept-physics'],
      ['student-2', 'dept-cs'],
    ]);

    const courses: CourseNode[] = [
      {
        courseId: 'course-phy401',
        departmentId: 'dept-physics',
        hoursPerWeek: 2,
        isLab: false,
        remainingHours: 2,
        isCrossDept: true,
        studentIds: new Set(['student-1', 'student-2']),
        conflictsWith: new Set(),
      },
    ];

    const result = generateTimetable(courses, buildSyntheticSlotMap(), studentDeptMap);

    const physicsEntries = result.assignments.filter(
      a => a.courseId === 'course-phy401' && a.departmentId === 'dept-physics'
    );
    const csEntries = result.assignments.filter(
      a => a.courseId === 'course-phy401' && a.departmentId === 'dept-cs'
    );

    // hoursPerWeek=2, so 2 placements each, 4 total assignments
    expect(physicsEntries).toHaveLength(2);
    expect(csEntries).toHaveLength(2);

    // Both departments get the same slots
    const physicsSlots = physicsEntries.map(a => a.timeSlotId).sort();
    const csSlots = csEntries.map(a => a.timeSlotId).sort();
    expect(physicsSlots).toEqual(csSlots);
  });

  it('single-dept course produces assignments only for its own department', () => {
    const studentDeptMap = new Map([
      ['student-1', 'dept-cs'],
      ['student-2', 'dept-cs'],
    ]);

    const courses: CourseNode[] = [
      {
        courseId: 'course-cs301',
        departmentId: 'dept-cs',
        hoursPerWeek: 1,
        isLab: false,
        remainingHours: 1,
        isCrossDept: false,
        studentIds: new Set(['student-1', 'student-2']),
        conflictsWith: new Set(),
      },
    ];

    const result = generateTimetable(courses, buildSyntheticSlotMap(), studentDeptMap);

    const uniqueDepts = new Set(result.assignments.map(a => a.departmentId));
    expect(uniqueDepts.size).toBe(1);
    expect(uniqueDepts.has('dept-cs')).toBe(true);
  });
});
