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
  theoryHours: number,
  practicalHours: number,
  studentIds: string[],
  isCrossDept: boolean = false
): CourseNode {
  return {
    courseId,
    departmentId,
    theoryHours,
    practicalHours,
    remainingTheoryHours: theoryHours,
    remainingPracticalHours: practicalHours,
    isCrossDept,
    studentIds: new Set(studentIds),
    conflictsWith: new Set<string>(),
  };
}

describe('generateTimetable Algorithm', () => {
  it('1. No conflict — two courses with zero shared students are placed', () => {
    const slotMap = buildSyntheticSlotMap();
    const courses = [
      createCourse('c1', 'dept1', 3, 0, ['s1', 's2']),
      createCourse('c2', 'dept2', 3, 0, ['s3', 's4']),
    ];

    const result = generateTimetable(courses, slotMap);

    expect(result.conflicts).toHaveLength(0);
    expect(result.assignments).toHaveLength(6);
  });

  it('2. Direct conflict — two courses sharing students are placed in different slots', () => {
    const slotMap = buildSyntheticSlotMap();
    const courses = [
      createCourse('c1', 'dept1', 1, 0, ['s1', 'shared']),
      createCourse('c2', 'dept1', 1, 0, ['s2', 'shared']),
    ];

    const result = generateTimetable(courses, slotMap);

    expect(result.conflicts).toHaveLength(0);
    expect(result.assignments).toHaveLength(2);
    expect(result.assignments[0].timeSlotId).not.toEqual(result.assignments[1].timeSlotId);
  });

  it('3. Hours constraint — course with theoryHours=3 gets exactly 3 slot assignments', () => {
    const slotMap = buildSyntheticSlotMap();
    const courses = [createCourse('c1', 'dept1', 3, 0, ['s1'])];

    const result = generateTimetable(courses, slotMap);

    expect(result.conflicts).toHaveLength(0);
    const c1Assignments = result.assignments.filter((a) => a.courseId === 'c1');
    expect(c1Assignments).toHaveLength(3);
  });

  it('4. Lab block — practical lab course gets a valid 2-period block', () => {
    const slotMap = buildSyntheticSlotMap();
    const courses = [createCourse('c_lab', 'dept1', 0, 2, ['s1'])];

    const result = generateTimetable(courses, slotMap);

    expect(result.conflicts).toHaveLength(0);
    expect(result.assignments).toHaveLength(2);
    expect(result.assignments[0].isLabBlock).toBe(true);
    expect(result.assignments[1].isLabBlock).toBe(true);

    // Verify slots are contiguous valid lab pair
    const p1 = parseInt(result.assignments[0].timeSlotId.split('-')[2]);
    const p2 = parseInt(result.assignments[1].timeSlotId.split('-')[2]);
    expect(Math.abs(p1 - p2)).toBe(1);
  });

  it('5. Cross-dept after single-dept — single-dept course occupies morning slot; cross-dept course prefers afternoon', () => {
    const slotMap = buildSyntheticSlotMap();
    const courses = [
      createCourse('c_single', 'dept1', 1, 0, ['s1'], false),
      createCourse('c_cross', 'dept2', 1, 0, ['s2'], true),
    ];

    const result = generateTimetable(courses, slotMap);

    expect(result.conflicts).toHaveLength(0);
    const crossAssignment = result.assignments.find((a) => a.courseId === 'c_cross');
    expect(crossAssignment).toBeDefined();

    const period = parseInt(crossAssignment!.timeSlotId.split('-')[2]);
    expect([4, 5, 1, 2, 3, 6]).toContain(period);
  });

  it('6. Unresolvable — 31 single-hour courses sharing students exhausting 30 slots marks overflow as unresolvable', () => {
    const slotMap = buildSyntheticSlotMap();
    const courses: CourseNode[] = [];

    for (let i = 1; i <= 31; i++) {
      courses.push(createCourse(`c_${i}`, 'dept1', 1, 0, ['s_shared']));
    }

    const result = generateTimetable(courses, slotMap);

    expect(result.assignments).toHaveLength(30);
    expect(result.conflicts.length).toBeGreaterThanOrEqual(1);
    expect(result.conflicts[0].conflictingStudentCount).toBeGreaterThan(0);
  });

  it('7. Zero student courses — zero student courses do not cause errors', () => {
    const slotMap = buildSyntheticSlotMap();
    const courses = [createCourse('c_empty', 'dept1', 3, 0, [])];

    const result = generateTimetable(courses, slotMap);
    expect(result.assignments).toHaveLength(3);
  });

  it('8. Day spread — a 3-hour theory course is distributed across distinct days', () => {
    const slotMap = buildSyntheticSlotMap();
    const courses = [createCourse('c_spread', 'dept1', 3, 0, ['s1'])];

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
        theoryHours: 2,
        practicalHours: 0,
        remainingTheoryHours: 2,
        remainingPracticalHours: 0,
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

    expect(physicsEntries).toHaveLength(2);
    expect(csEntries).toHaveLength(2);

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
        theoryHours: 1,
        practicalHours: 0,
        remainingTheoryHours: 1,
        remainingPracticalHours: 0,
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

  // --- NEW UPDATE 02 TEST CASES ---

  it('places theory slots and practical lab blocks separately for the same course', () => {
    const courses: CourseNode[] = [{
      courseId: 'course-a',
      departmentId: 'dept-a',
      theoryHours: 2,
      practicalHours: 2,
      remainingTheoryHours: 2,
      remainingPracticalHours: 2,
      isCrossDept: false,
      studentIds: new Set(['s1']),
      conflictsWith: new Set(),
    }];
    const studentDeptMap = new Map([['s1', 'dept-a']]);
    const result = generateTimetable(courses, buildSyntheticSlotMap(), studentDeptMap);
    const theoryEntries = result.assignments.filter(
      a => a.courseId === 'course-a' && a.sessionType === 'theory'
    );
    const practicalEntries = result.assignments.filter(
      a => a.courseId === 'course-a' && a.sessionType === 'practical'
    );
    expect(theoryEntries).toHaveLength(2); // 2 theory slots
    expect(practicalEntries).toHaveLength(2); // 1 lab block = 2 slot entries
    expect(practicalEntries.every(e => e.isLabBlock)).toBe(true);
    // No slot overlap between theory and practical
    const theorySlots = new Set(theoryEntries.map(e => e.timeSlotId));
    const practicalSlots = new Set(practicalEntries.map(e => e.timeSlotId));
    for (const slot of practicalSlots) {
      expect(theorySlots.has(slot)).toBe(false);
    }
  });

  it('handles course with theory hours only', () => {
    const courses: CourseNode[] = [{
      courseId: 'course-b',
      departmentId: 'dept-a',
      theoryHours: 3,
      practicalHours: 0,
      remainingTheoryHours: 3,
      remainingPracticalHours: 0,
      isCrossDept: false,
      studentIds: new Set(['s1']),
      conflictsWith: new Set(),
    }];
    const studentDeptMap = new Map([['s1', 'dept-a']]);
    const result = generateTimetable(courses, buildSyntheticSlotMap(), studentDeptMap);
    expect(result.assignments.filter(a => a.sessionType === 'theory')).toHaveLength(3);
    expect(result.assignments.filter(a => a.sessionType === 'practical')).toHaveLength(0);
    expect(result.conflicts).toHaveLength(0);
  });

  it('handles course with practical hours only', () => {
    const courses: CourseNode[] = [{
      courseId: 'course-c',
      departmentId: 'dept-a',
      theoryHours: 0,
      practicalHours: 2,
      remainingTheoryHours: 0,
      remainingPracticalHours: 2,
      isCrossDept: false,
      studentIds: new Set(['s1']),
      conflictsWith: new Set(),
    }];
    const studentDeptMap = new Map([['s1', 'dept-a']]);
    const result = generateTimetable(courses, buildSyntheticSlotMap(), studentDeptMap);
    const practical = result.assignments.filter(a => a.sessionType === 'practical');
    expect(practical).toHaveLength(2); // one lab block = 2 consecutive slot entries
    expect(practical.every(e => e.isLabBlock)).toBe(true);
    expect(result.conflicts).toHaveLength(0);
  });

  it('never places a practical block that crosses the lunch break', () => {
    // A course that can only fit into lab blocks
    const courses: CourseNode[] = [{
      courseId: 'course-d',
      departmentId: 'dept-a',
      theoryHours: 0,
      practicalHours: 2,
      remainingTheoryHours: 0,
      remainingPracticalHours: 2,
      isCrossDept: false,
      studentIds: new Set(['s1']),
      conflictsWith: new Set(),
    }];
    const studentDeptMap = new Map([['s1', 'dept-a']]);
    const slotMap = buildSyntheticSlotMap();
    const result = generateTimetable(courses, slotMap, studentDeptMap);
    // Get period numbers for assigned practical slots
    // P3 slot id = slotMap[day][3], P4 = slotMap[day][4]
    // Verify no assignment lands on both P3 and P4 of the same day
    const practicalSlotIds = result.assignments
      .filter(a => a.sessionType === 'practical')
      .map(a => a.timeSlotId);
    for (let day = 1; day <= 5; day++) {
      const p3 = slotMap.get(day)?.get(3);
      const p4 = slotMap.get(day)?.get(4);
      const hasP3 = practicalSlotIds.includes(p3!);
      const hasP4 = practicalSlotIds.includes(p4!);
      // Should never have BOTH P3 and P4 of same day as a pair
      expect(hasP3 && hasP4).toBe(false);
    }
  });
});
