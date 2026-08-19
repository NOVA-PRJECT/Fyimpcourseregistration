import {
  CourseNode,
  GenerationResult,
  LAB_BLOCK_PAIRS,
  SlotAssignment,
  SlotId,
  UnresolvableCourse,
} from './types';

function sharesStudents(a: CourseNode, b: CourseNode): boolean {
  const [smaller, larger] =
    a.studentIds.size < b.studentIds.size
      ? [a.studentIds, b.studentIds]
      : [b.studentIds, a.studentIds];
  for (const id of smaller) {
    if (larger.has(id)) return true;
  }
  return false;
}

function countSharedStudents(a: CourseNode, b: CourseNode): number {
  let count = 0;
  const [smaller, larger] =
    a.studentIds.size < b.studentIds.size
      ? [a.studentIds, b.studentIds]
      : [b.studentIds, a.studentIds];
  for (const id of smaller) {
    if (larger.has(id)) count++;
  }
  return count;
}

function canPlace(
  course: CourseNode,
  slotId: SlotId,
  studentSlotMap: Map<string, Set<SlotId>>
): boolean {
  for (const studentId of course.studentIds) {
    if (studentSlotMap.get(studentId)?.has(slotId)) {
      return false;
    }
  }
  return true;
}

function place(
  course: CourseNode,
  slotId: SlotId,
  isLabBlock: boolean,
  assignments: SlotAssignment[],
  studentSlotMap: Map<string, Set<SlotId>>,
  courseAssignedDays: Map<string, Set<number>>,
  day: number,
  studentDeptMap: Map<string, string>
) {
  const affectedDeptIds = new Set<string>();
  for (const studentId of course.studentIds) {
    const deptId = studentDeptMap.get(studentId);
    if (deptId) affectedDeptIds.add(deptId);
  }
  // Always include the owning department even if no students mapped
  affectedDeptIds.add(course.departmentId);

  for (const deptId of affectedDeptIds) {
    assignments.push({
      courseId: course.courseId,
      departmentId: deptId,
      timeSlotId: slotId,
      isLabBlock,
    });
  }

  for (const studentId of course.studentIds) {
    let studentSet = studentSlotMap.get(studentId);
    if (!studentSet) {
      studentSet = new Set();
      studentSlotMap.set(studentId, studentSet);
    }
    studentSet.add(slotId);
  }

  let daySet = courseAssignedDays.get(course.courseId);
  if (!daySet) {
    daySet = new Set();
    courseAssignedDays.set(course.courseId, daySet);
  }
  daySet.add(day);
}

export function generateTimetable(
  courses: CourseNode[],
  slotMap: Map<number, Map<number, SlotId>>, // slotMap[day][period] = uuid
  studentDeptMap: Map<string, string> = new Map(), // studentId -> departmentId
  onProgressSync?: (progress: number, stepMessage: string, stats?: Record<string, any>) => void
): GenerationResult & {
  stats: {
    totalHours: number;
    placedHours: number;
    conflictEdgesCount: number;
    assignmentsCount: number;
    conflictsCount: number;
  };
} {
  const assignments: SlotAssignment[] = [];
  const conflicts: UnresolvableCourse[] = [];
  const studentSlotMap = new Map<string, Set<SlotId>>();
  const courseAssignedDays = new Map<string, Set<number>>();

  // 1. Build conflict graph
  let conflictEdgesCount = 0;
  for (let i = 0; i < courses.length; i++) {
    for (let j = i + 1; j < courses.length; j++) {
      if (sharesStudents(courses[i], courses[j])) {
        courses[i].conflictsWith.add(courses[j].courseId);
        courses[j].conflictsWith.add(courses[i].courseId);
        conflictEdgesCount++;
      }
    }
  }

  onProgressSync?.(
    40,
    `⚡ Built conflict graph with ${conflictEdgesCount} student overlap constraint(s)...`,
    { conflictEdgesCount }
  );

  const totalHours = courses.reduce((sum, c) => sum + c.hoursPerWeek, 0);

  // 2. Split into phases
  const phase1 = courses.filter((c) => !c.isCrossDept);
  const phase2 = courses.filter((c) => c.isCrossDept);

  const phases = [
    {
      name: 'Single-Department Courses',
      courses: phase1,
      periods: [1, 2, 3, 4, 5, 6],
      labPairs: [
        [1, 2],
        [2, 3],
        [4, 5],
        [5, 6],
      ] as [number, number][],
    },
    {
      name: 'Cross-Department Courses',
      courses: phase2,
      periods: [4, 5, 1, 2, 3, 6],
      labPairs: [
        [4, 5],
        [5, 6],
        [1, 2],
        [2, 3],
      ] as [number, number][],
    },
  ];

  const days = [1, 2, 3, 4, 5];

  for (const phase of phases) {
    const deptMap = new Map<string, CourseNode[]>();
    for (const c of phase.courses) {
      let list = deptMap.get(c.departmentId);
      if (!list) {
        list = [];
        deptMap.set(c.departmentId, list);
      }
      list.push(c);
    }

    for (const list of deptMap.values()) {
      list.sort((a, b) => b.conflictsWith.size - a.conflictsWith.size);
    }

    const deptKeys = Array.from(deptMap.keys());

    while (phase.courses.some((c) => c.remainingHours > 0)) {
      let anyPlacedInRound = false;

      for (const deptId of deptKeys) {
        const deptCourses = deptMap.get(deptId) || [];
        const course = deptCourses.find((c) => c.remainingHours > 0);
        if (!course) continue;

        let placed = false;
        const usedDays = courseAssignedDays.get(course.courseId) || new Set();

        const sortedDays = [
          ...days.filter((d) => !usedDays.has(d)),
          ...days.filter((d) => usedDays.has(d)),
        ];

        if (course.isLab && course.remainingHours >= 2) {
          for (const [pA, pB] of phase.labPairs) {
            if (placed) break;
            for (const day of sortedDays) {
              const slotA = slotMap.get(day)?.get(pA);
              const slotB = slotMap.get(day)?.get(pB);
              if (
                slotA &&
                slotB &&
                canPlace(course, slotA, studentSlotMap) &&
                canPlace(course, slotB, studentSlotMap)
              ) {
                place(course, slotA, true, assignments, studentSlotMap, courseAssignedDays, day, studentDeptMap);
                place(course, slotB, true, assignments, studentSlotMap, courseAssignedDays, day, studentDeptMap);
                course.remainingHours -= 2;
                placed = true;
                anyPlacedInRound = true;
                break;
              }
            }
          }
        } else {
          for (const day of sortedDays) {
            if (placed) break;
            for (const period of phase.periods) {
              const slot = slotMap.get(day)?.get(period);
              if (slot && canPlace(course, slot, studentSlotMap)) {
                place(course, slot, false, assignments, studentSlotMap, courseAssignedDays, day, studentDeptMap);
                course.remainingHours -= 1;
                placed = true;
                anyPlacedInRound = true;
                break;
              }
            }
          }
        }

        if (placed) {
          const currentlyPlacedHours = totalHours - courses.reduce((sum, c) => sum + c.remainingHours, 0);
          const pct = Math.min(75, 40 + Math.floor((currentlyPlacedHours / Math.max(1, totalHours)) * 35));
          onProgressSync?.(
            pct,
            `🧠 Allocated ${currentlyPlacedHours}/${totalHours} course hours into grid slots...`,
            { placedHours: currentlyPlacedHours, totalHours, conflictEdgesCount }
          );
        }

        if (!placed) {
          const blockingCourseIds = new Set<string>();
          let totalConflictingStudents = 0;

          for (const otherCourse of courses) {
            if (otherCourse.courseId === course.courseId) continue;
            if (sharesStudents(course, otherCourse)) {
              blockingCourseIds.add(otherCourse.courseId);
              totalConflictingStudents += countSharedStudents(course, otherCourse);
            }
          }

          conflicts.push({
            courseId: course.courseId,
            departmentId: course.departmentId,
            blockingCourseIds: Array.from(blockingCourseIds),
            conflictingStudentCount: totalConflictingStudents,
            reason: `Could not allocate ${course.remainingHours} hour(s) for course ${course.courseId} because enrolled students have overlapping classes in all available time slots.`,
          });

          course.remainingHours = 0;
        }
      }

      if (!anyPlacedInRound) {
        for (const course of phase.courses) {
          if (course.remainingHours > 0) {
            const blockingCourseIds = new Set<string>();
            let totalConflictingStudents = 0;

            for (const otherCourse of courses) {
              if (otherCourse.courseId === course.courseId) continue;
              if (sharesStudents(course, otherCourse)) {
                blockingCourseIds.add(otherCourse.courseId);
                totalConflictingStudents += countSharedStudents(course, otherCourse);
              }
            }

            conflicts.push({
              courseId: course.courseId,
              departmentId: course.departmentId,
              blockingCourseIds: Array.from(blockingCourseIds),
              conflictingStudentCount: totalConflictingStudents,
              reason: `Could not allocate ${course.remainingHours} hour(s) for course ${course.courseId} because all valid weekly time slots are fully occupied.`,
            });

            course.remainingHours = 0;
          }
        }
        break;
      }
    }
  }

  const finalPlacedHours = totalHours - courses.reduce((sum, c) => sum + c.remainingHours, 0);

  return {
    assignments,
    conflicts,
    stats: {
      totalHours,
      placedHours: finalPlacedHours,
      conflictEdgesCount,
      assignmentsCount: assignments.length,
      conflictsCount: conflicts.length,
    },
  };
}
