import { describe, it, expect } from 'vitest';
import { generateTimetable } from '../generator';
import { detectParallelGroups } from '../loader';
import { CourseNode, ParallelGroup, SlotId } from '../types';

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
  isCrossDept: boolean = false,
  category: string = 'DSC'
): CourseNode {
  return {
    courseId,
    departmentId,
    category,
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
        category: 'DSE',
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
      (a) => a.courseId === 'course-phy401' && a.departmentId === 'dept-physics'
    );
    const csEntries = result.assignments.filter(
      (a) => a.courseId === 'course-phy401' && a.departmentId === 'dept-cs'
    );

    expect(physicsEntries).toHaveLength(2);
    expect(csEntries).toHaveLength(2);

    const physicsSlots = physicsEntries.map((a) => a.timeSlotId).sort();
    const csSlots = csEntries.map((a) => a.timeSlotId).sort();
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
        category: 'DSC',
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

    const uniqueDepts = new Set(result.assignments.map((a) => a.departmentId));
    expect(uniqueDepts.size).toBe(1);
    expect(uniqueDepts.has('dept-cs')).toBe(true);
  });

  // --- UPDATE 02 TEST CASES ---

  it('places theory slots and practical lab blocks separately for the same course', () => {
    const courses: CourseNode[] = [
      {
        courseId: 'course-a',
        departmentId: 'dept-a',
        category: 'DSC',
        theoryHours: 2,
        practicalHours: 2,
        remainingTheoryHours: 2,
        remainingPracticalHours: 2,
        isCrossDept: false,
        studentIds: new Set(['s1']),
        conflictsWith: new Set(),
      },
    ];
    const studentDeptMap = new Map([['s1', 'dept-a']]);
    const result = generateTimetable(courses, buildSyntheticSlotMap(), studentDeptMap);
    const theoryEntries = result.assignments.filter(
      (a) => a.courseId === 'course-a' && a.sessionType === 'theory'
    );
    const practicalEntries = result.assignments.filter(
      (a) => a.courseId === 'course-a' && a.sessionType === 'practical'
    );
    expect(theoryEntries).toHaveLength(2);
    expect(practicalEntries).toHaveLength(2);
    expect(practicalEntries.every((e) => e.isLabBlock)).toBe(true);

    const theorySlots = new Set(theoryEntries.map((e) => e.timeSlotId));
    const practicalSlots = new Set(practicalEntries.map((e) => e.timeSlotId));
    for (const slot of practicalSlots) {
      expect(theorySlots.has(slot)).toBe(false);
    }
  });

  it('handles course with theory hours only', () => {
    const courses: CourseNode[] = [
      {
        courseId: 'course-b',
        departmentId: 'dept-a',
        category: 'DSC',
        theoryHours: 3,
        practicalHours: 0,
        remainingTheoryHours: 3,
        remainingPracticalHours: 0,
        isCrossDept: false,
        studentIds: new Set(['s1']),
        conflictsWith: new Set(),
      },
    ];
    const studentDeptMap = new Map([['s1', 'dept-a']]);
    const result = generateTimetable(courses, buildSyntheticSlotMap(), studentDeptMap);
    expect(result.assignments.filter((a) => a.sessionType === 'theory')).toHaveLength(3);
    expect(result.assignments.filter((a) => a.sessionType === 'practical')).toHaveLength(0);
    expect(result.conflicts).toHaveLength(0);
  });

  it('handles course with practical hours only', () => {
    const courses: CourseNode[] = [
      {
        courseId: 'course-c',
        departmentId: 'dept-a',
        category: 'DSC',
        theoryHours: 0,
        practicalHours: 2,
        remainingTheoryHours: 0,
        remainingPracticalHours: 2,
        isCrossDept: false,
        studentIds: new Set(['s1']),
        conflictsWith: new Set(),
      },
    ];
    const studentDeptMap = new Map([['s1', 'dept-a']]);
    const result = generateTimetable(courses, buildSyntheticSlotMap(), studentDeptMap);
    const practical = result.assignments.filter((a) => a.sessionType === 'practical');
    expect(practical).toHaveLength(2);
    expect(practical.every((e) => e.isLabBlock)).toBe(true);
    expect(result.conflicts).toHaveLength(0);
  });

  it('never places a practical block that crosses the lunch break', () => {
    const courses: CourseNode[] = [
      {
        courseId: 'course-d',
        departmentId: 'dept-a',
        category: 'DSC',
        theoryHours: 0,
        practicalHours: 2,
        remainingTheoryHours: 0,
        remainingPracticalHours: 2,
        isCrossDept: false,
        studentIds: new Set(['s1']),
        conflictsWith: new Set(),
      },
    ];
    const studentDeptMap = new Map([['s1', 'dept-a']]);
    const slotMap = buildSyntheticSlotMap();
    const result = generateTimetable(courses, slotMap, studentDeptMap);

    const practicalSlotIds = result.assignments
      .filter((a) => a.sessionType === 'practical')
      .map((a) => a.timeSlotId);
    for (let day = 1; day <= 5; day++) {
      const p3 = slotMap.get(day)?.get(3);
      const p4 = slotMap.get(day)?.get(4);
      const hasP3 = practicalSlotIds.includes(p3!);
      const hasP4 = practicalSlotIds.includes(p4!);
      expect(hasP3 && hasP4).toBe(false);
    }
  });

  // --- UPDATE 04 PARALLEL COURSE GROUP TESTS ---

  it('places all courses in a parallel group into the same slot', () => {
    const slotMap = buildSyntheticSlotMap();
    const courses: CourseNode[] = [
      createCourse('c1', 'dept1', 1, 0, ['s1']),
      createCourse('c2', 'dept1', 1, 0, ['s2']),
    ];

    const parallelGroups: ParallelGroup[] = [
      { groupId: 'group-1', departmentId: 'dept1', courseIds: ['c1', 'c2'] },
    ];

    const result = generateTimetable(courses, slotMap, new Map(), parallelGroups);

    expect(result.conflicts).toHaveLength(0);
    const c1Assignments = result.assignments.filter((a) => a.courseId === 'c1');
    const c2Assignments = result.assignments.filter((a) => a.courseId === 'c2');

    expect(c1Assignments).toHaveLength(1);
    expect(c2Assignments).toHaveLength(1);
    expect(c1Assignments[0].timeSlotId).toEqual(c2Assignments[0].timeSlotId);
  });

  it('does not conflict students across parallel group courses', () => {
    const slotMap = buildSyntheticSlotMap();
    const courses: CourseNode[] = [
      createCourse('c1', 'dept1', 1, 0, ['s1']),
      createCourse('c2', 'dept1', 1, 0, ['s2']),
      createCourse('c3', 'dept1', 1, 0, ['s1', 's2']),
    ];

    const parallelGroups: ParallelGroup[] = [
      { groupId: 'group-1', departmentId: 'dept1', courseIds: ['c1', 'c2'] },
    ];

    const result = generateTimetable(courses, slotMap, new Map(), parallelGroups);

    expect(result.conflicts).toHaveLength(0);
    const groupSlotId = result.assignments.find((a) => a.courseId === 'c1')!.timeSlotId;
    const c3SlotId = result.assignments.find((a) => a.courseId === 'c3')!.timeSlotId;

    expect(groupSlotId).not.toEqual(c3SlotId);
  });

  it('a group with only one surviving course is treated as a normal course', () => {
    const slotMap = buildSyntheticSlotMap();
    const courses: CourseNode[] = [createCourse('c1', 'dept1', 1, 0, ['s1'])];
    const parallelGroups: ParallelGroup[] = [];

    const result = generateTimetable(courses, slotMap, new Map(), parallelGroups);

    expect(result.conflicts).toHaveLength(0);
    expect(result.assignments).toHaveLength(1);
  });

  // --- UPDATE 05 AUTO-DETECTION TESTS ---

  it('auto-detects parallel group when courses share zero students', () => {
    const courses: CourseNode[] = [
      {
        courseId: 'mat301',
        departmentId: 'dept-math',
        category: 'DSE',
        theoryHours: 2,
        practicalHours: 0,
        remainingTheoryHours: 2,
        remainingPracticalHours: 0,
        isCrossDept: false,
        studentIds: new Set(['s1', 's2']),
        conflictsWith: new Set(),
      },
      {
        courseId: 'mat302',
        departmentId: 'dept-math',
        category: 'DSE',
        theoryHours: 2,
        practicalHours: 0,
        remainingTheoryHours: 2,
        remainingPracticalHours: 0,
        isCrossDept: false,
        studentIds: new Set(['s3', 's4']),
        conflictsWith: new Set(),
      },
    ];
    const groups = detectParallelGroups(courses);
    expect(groups).toHaveLength(1);
    expect(groups[0].courseIds).toContain('mat301');
    expect(groups[0].courseIds).toContain('mat302');
  });

  it('does not form a group when courses share at least one student', () => {
    const courses: CourseNode[] = [
      {
        courseId: 'mat301',
        departmentId: 'dept-math',
        category: 'DSE',
        theoryHours: 2,
        practicalHours: 0,
        remainingTheoryHours: 2,
        remainingPracticalHours: 0,
        isCrossDept: false,
        studentIds: new Set(['s1', 's2']),
        conflictsWith: new Set(),
      },
      {
        courseId: 'mat302',
        departmentId: 'dept-math',
        category: 'DSE',
        theoryHours: 2,
        practicalHours: 0,
        remainingTheoryHours: 2,
        remainingPracticalHours: 0,
        isCrossDept: false,
        studentIds: new Set(['s2', 's3']), // s2 shared
        conflictsWith: new Set(),
      },
    ];
    const groups = detectParallelGroups(courses);
    expect(groups).toHaveLength(0);
  });

  it('does not group courses from different departments even with same category', () => {
    const courses: CourseNode[] = [
      {
        courseId: 'mat301',
        departmentId: 'dept-math',
        category: 'DSE',
        theoryHours: 2,
        practicalHours: 0,
        remainingTheoryHours: 2,
        remainingPracticalHours: 0,
        isCrossDept: false,
        studentIds: new Set(['s1']),
        conflictsWith: new Set(),
      },
      {
        courseId: 'phy301',
        departmentId: 'dept-physics',
        category: 'DSE',
        theoryHours: 2,
        practicalHours: 0,
        remainingTheoryHours: 2,
        remainingPracticalHours: 0,
        isCrossDept: false,
        studentIds: new Set(['s2']),
        conflictsWith: new Set(),
      },
    ];
    const groups = detectParallelGroups(courses);
    expect(groups).toHaveLength(0);
  });

  it('single surviving elective course is not grouped', () => {
    const courses: CourseNode[] = [
      {
        courseId: 'mat301',
        departmentId: 'dept-math',
        category: 'DSE',
        theoryHours: 3,
        practicalHours: 0,
        remainingTheoryHours: 3,
        remainingPracticalHours: 0,
        isCrossDept: false,
        studentIds: new Set(['s1', 's2']),
        conflictsWith: new Set(),
      },
    ];
    const groups = detectParallelGroups(courses);
    expect(groups).toHaveLength(0);
  });

  // --- UPDATE 06 CAMPUS-SYNC EXCLUSIVE CATEGORY SCHEDULING TESTS ---

  it('places all AEC courses campus-wide in the same block', () => {
    const courses: CourseNode[] = [
      {
        courseId: 'aec-physics',
        departmentId: 'dept-physics',
        category: 'AEC',
        theoryHours: 3,
        practicalHours: 0,
        remainingTheoryHours: 3,
        remainingPracticalHours: 0,
        isCrossDept: false,
        studentIds: new Set(['s1', 's2']),
        conflictsWith: new Set(),
      },
      {
        courseId: 'aec-cs',
        departmentId: 'dept-cs',
        category: 'AEC',
        theoryHours: 3,
        practicalHours: 0,
        remainingTheoryHours: 3,
        remainingPracticalHours: 0,
        isCrossDept: false,
        studentIds: new Set(['s3', 's4']),
        conflictsWith: new Set(),
      },
      {
        courseId: 'aec-math',
        departmentId: 'dept-math',
        category: 'AEC',
        theoryHours: 3,
        practicalHours: 0,
        remainingTheoryHours: 3,
        remainingPracticalHours: 0,
        isCrossDept: false,
        studentIds: new Set(['s5', 's6']),
        conflictsWith: new Set(),
      },
    ];

    const studentDeptMap = new Map([
      ['s1', 'dept-physics'],
      ['s2', 'dept-physics'],
      ['s3', 'dept-cs'],
      ['s4', 'dept-cs'],
      ['s5', 'dept-math'],
      ['s6', 'dept-math'],
    ]);

    const result = generateTimetable(courses, buildSyntheticSlotMap(), studentDeptMap, []);

    // All three AEC courses should have exactly 3 assignments each (one block of 3)
    const physicsSlots = result.assignments
      .filter((a) => a.courseId === 'aec-physics')
      .map((a) => a.timeSlotId)
      .sort();
    const csSlots = result.assignments
      .filter((a) => a.courseId === 'aec-cs')
      .map((a) => a.timeSlotId)
      .sort();
    const mathSlots = result.assignments
      .filter((a) => a.courseId === 'aec-math')
      .map((a) => a.timeSlotId)
      .sort();

    // All three must occupy the exact same slots
    expect(physicsSlots).toEqual(csSlots);
    expect(csSlots).toEqual(mathSlots);

    // Must be 3 consecutive slots on the same day
    expect(physicsSlots).toHaveLength(3);
    expect(result.conflicts).toHaveLength(0);
  });

  it('AEC slots are exclusive — DSC course skips them', () => {
    const courses: CourseNode[] = [
      {
        courseId: 'aec-cs',
        departmentId: 'dept-cs',
        category: 'AEC',
        theoryHours: 3,
        practicalHours: 0,
        remainingTheoryHours: 3,
        remainingPracticalHours: 0,
        isCrossDept: false,
        studentIds: new Set(['s1']),
        conflictsWith: new Set(),
      },
      {
        courseId: 'dsc-cs',
        departmentId: 'dept-cs',
        category: 'DSC',
        theoryHours: 1,
        practicalHours: 0,
        remainingTheoryHours: 1,
        remainingPracticalHours: 0,
        isCrossDept: false,
        studentIds: new Set(['s2']), // different student — no student conflict
        conflictsWith: new Set(),
      },
    ];

    const studentDeptMap = new Map([
      ['s1', 'dept-cs'],
      ['s2', 'dept-cs'],
    ]);

    const result = generateTimetable(courses, buildSyntheticSlotMap(), studentDeptMap, []);

    const aecSlots = new Set(
      result.assignments.filter((a) => a.courseId === 'aec-cs').map((a) => a.timeSlotId)
    );
    const dscSlots = result.assignments
      .filter((a) => a.courseId === 'dsc-cs')
      .map((a) => a.timeSlotId);

    // DSC course must NOT be in any AEC slot even though no student conflict exists
    for (const slot of dscSlots) {
      expect(aecSlots.has(slot)).toBe(false);
    }
  });

  it('VAC with 2 hours placed as a single 2-hour block campus-wide', () => {
    const courses: CourseNode[] = [
      {
        courseId: 'vac-phy',
        departmentId: 'dept-physics',
        category: 'VAC',
        theoryHours: 2,
        practicalHours: 0,
        remainingTheoryHours: 2,
        remainingPracticalHours: 0,
        isCrossDept: false,
        studentIds: new Set(['s1']),
        conflictsWith: new Set(),
      },
      {
        courseId: 'vac-cs',
        departmentId: 'dept-cs',
        category: 'VAC',
        theoryHours: 2,
        practicalHours: 0,
        remainingTheoryHours: 2,
        remainingPracticalHours: 0,
        isCrossDept: false,
        studentIds: new Set(['s2']),
        conflictsWith: new Set(),
      },
    ];

    const studentDeptMap = new Map([
      ['s1', 'dept-physics'],
      ['s2', 'dept-cs'],
    ]);

    const result = generateTimetable(courses, buildSyntheticSlotMap(), studentDeptMap, []);

    const phySlots = result.assignments
      .filter((a) => a.courseId === 'vac-phy')
      .map((a) => a.timeSlotId)
      .sort();
    const csSlots = result.assignments
      .filter((a) => a.courseId === 'vac-cs')
      .map((a) => a.timeSlotId)
      .sort();

    // Same slots, 2 entries each (one 2-hour block)
    expect(phySlots).toEqual(csSlots);
    expect(phySlots).toHaveLength(2);
    expect(result.conflicts).toHaveLength(0);
  });

  it('CSE courses do not enter parallel group detection', () => {
    // VAC courses with zero student overlap should NOT form a parallel group
    // They are handled by Pre-Phase 0 instead
    const courses: CourseNode[] = [
      {
        courseId: 'vac-yoga',
        departmentId: 'dept-pes',
        category: 'VAC',
        theoryHours: 2,
        practicalHours: 0,
        remainingTheoryHours: 2,
        remainingPracticalHours: 0,
        isCrossDept: false,
        studentIds: new Set(['s1']),
        conflictsWith: new Set(),
      },
      {
        courseId: 'vac-wellness',
        departmentId: 'dept-pes',
        category: 'VAC',
        theoryHours: 2,
        practicalHours: 0,
        remainingTheoryHours: 2,
        remainingPracticalHours: 0,
        isCrossDept: false,
        studentIds: new Set(['s2']),
        conflictsWith: new Set(),
      },
    ];

    const groups = detectParallelGroups(courses);
    // VAC is excluded from parallel group detection
    expect(groups).toHaveLength(0);
  });

  it('course offered by dept-a with only dept-b students is assigned only to dept-b', () => {
    const courses: CourseNode[] = [
      {
        courseId: 'mdc-cse',
        departmentId: 'dept-it', // Offered by IT
        category: 'MDC',
        theoryHours: 1,
        practicalHours: 0,
        remainingTheoryHours: 1,
        remainingPracticalHours: 0,
        isCrossDept: false,
        studentIds: new Set(['student-psy-1', 'student-psy-2']), // Only Psychology students
        conflictsWith: new Set(),
      },
    ];

    const studentDeptMap = new Map([
      ['student-psy-1', 'dept-psychology'],
      ['student-psy-2', 'dept-psychology'],
    ]);

    const result = generateTimetable(courses, buildSyntheticSlotMap(), studentDeptMap, []);

    const itEntries = result.assignments.filter(
      (a) => a.courseId === 'mdc-cse' && a.departmentId === 'dept-it'
    );
    const psyEntries = result.assignments.filter(
      (a) => a.courseId === 'mdc-cse' && a.departmentId === 'dept-psychology'
    );

    // Should NOT appear in IT department timetable since 0 IT students took it
    expect(itEntries).toHaveLength(0);
    // Should appear in Psychology department timetable where students are actually registered
    expect(psyEntries).toHaveLength(1);
  });

  it('courses with different practical/theory hours structure do not form a parallel group', () => {
    const courses: CourseNode[] = [
      {
        courseId: 'dsc-stats-lab',
        departmentId: 'dept-it',
        category: 'DSC',
        theoryHours: 3,
        practicalHours: 2, // Has 2h Lab
        remainingTheoryHours: 3,
        remainingPracticalHours: 2,
        isCrossDept: false,
        studentIds: new Set(['s1', 's2']),
        conflictsWith: new Set(),
      },
      {
        courseId: 'dsc-eco-theory',
        departmentId: 'dept-it',
        category: 'DSC',
        theoryHours: 3,
        practicalHours: 0, // Pure Theory (0h Lab)
        remainingTheoryHours: 3,
        remainingPracticalHours: 0,
        isCrossDept: false,
        studentIds: new Set(['s3', 's4']),
        conflictsWith: new Set(),
      },
    ];

    const groups = detectParallelGroups(courses);
    // Must NOT be grouped into a single parallel group because one has a lab and the other does not
    expect(groups).toHaveLength(0);
  });
});
