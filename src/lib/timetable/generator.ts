import {
  CourseNode,
  GenerationResult,
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
  slotIds: SlotId[],
  studentSlotMap: Map<string, Set<SlotId>>
): boolean {
  for (const studentId of course.studentIds) {
    const occupied = studentSlotMap.get(studentId);
    if (!occupied) continue;
    for (const slotId of slotIds) {
      if (occupied.has(slotId)) return false;
    }
  }
  return true;
}

function place(
  course: CourseNode,
  slotIds: SlotId[],
  sessionType: 'theory' | 'practical',
  studentDeptMap: Map<string, string>,
  studentSlotMap: Map<string, Set<SlotId>>,
  assignments: SlotAssignment[]
): void {
  const affectedDeptIds = new Set<string>([course.departmentId]);
  for (const studentId of course.studentIds) {
    const deptId = studentDeptMap.get(studentId);
    if (deptId) affectedDeptIds.add(deptId);
  }

  for (const deptId of affectedDeptIds) {
    for (const slotId of slotIds) {
      assignments.push({
        courseId: course.courseId,
        departmentId: deptId,
        timeSlotId: slotId,
        isLabBlock: sessionType === 'practical',
        sessionType,
      });
    }
  }

  for (const studentId of course.studentIds) {
    let studentSet = studentSlotMap.get(studentId);
    if (!studentSet) {
      studentSet = new Set();
      studentSlotMap.set(studentId, studentSet);
    }
    for (const slotId of slotIds) {
      studentSet.add(slotId);
    }
  }
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
  const theoryAssignedDays = new Map<string, Set<number>>();

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

  const totalHours = courses.reduce(
    (sum, c) => sum + c.theoryHours + c.practicalHours,
    0
  );

  // 2. Split into phases
  const phase1 = courses.filter((c) => !c.isCrossDept);
  const phase2 = courses.filter((c) => c.isCrossDept);

  const phases = [
    {
      name: 'Single-Department Courses',
      courses: phase1,
      theoryPeriods: [1, 2, 3, 4, 5, 6], // Morning first [1,2,3], then [4,5,6]
    },
    {
      name: 'Cross-Department Courses',
      courses: phase2,
      theoryPeriods: [4, 5, 1, 2, 3, 6], // Afternoon first [4,5], then [1,2,3,6]
    },
  ];

  const days = [1, 2, 3, 4, 5];

  // Practical lab block pairs ordered: Afternoon first [(4,5), (5,6)], then Morning [(1,2), (2,3)]
  // P3+P4 is ALWAYS illegal (crosses lunch).
  const practicalLabPairOrders: [number, number][] = [
    [4, 5],
    [5, 6],
    [1, 2],
    [2, 3],
  ];

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

    while (
      phase.courses.some(
        (c) => c.remainingTheoryHours > 0 || c.remainingPracticalHours > 0
      )
    ) {
      let anyPlacedInRound = false;

      for (const deptId of deptKeys) {
        const deptCourses = deptMap.get(deptId) || [];
        const course = deptCourses.find(
          (c) => c.remainingTheoryHours > 0 || c.remainingPracticalHours > 0
        );
        if (!course) continue;

        let placedInThisRound = false;

        // Priority 1: Theory placement
        if (course.remainingTheoryHours > 0) {
          const usedDays = theoryAssignedDays.get(course.courseId) || new Set();
          const sortedDays = [
            ...days.filter((d) => !usedDays.has(d)),
            ...days.filter((d) => usedDays.has(d)),
          ];

          for (const day of sortedDays) {
            if (placedInThisRound) break;
            for (const period of phase.theoryPeriods) {
              const slotId = slotMap.get(day)?.get(period);
              if (slotId && canPlace(course, [slotId], studentSlotMap)) {
                place(
                  course,
                  [slotId],
                  'theory',
                  studentDeptMap,
                  studentSlotMap,
                  assignments
                );
                course.remainingTheoryHours -= 1;

                let daySet = theoryAssignedDays.get(course.courseId);
                if (!daySet) {
                  daySet = new Set();
                  theoryAssignedDays.set(course.courseId, daySet);
                }
                daySet.add(day);

                placedInThisRound = true;
                anyPlacedInRound = true;
                break;
              }
            }
          }

          if (!placedInThisRound) {
            // Theory slot could not be placed after checking all slots
            const blockingCourseIds = new Set<string>();
            let totalConflictingStudents = 0;

            for (const otherCourse of courses) {
              if (otherCourse.courseId === course.courseId) continue;
              if (sharesStudents(course, otherCourse)) {
                blockingCourseIds.add(otherCourse.courseId);
                totalConflictingStudents += countSharedStudents(
                  course,
                  otherCourse
                );
              }
            }

            conflicts.push({
              courseId: course.courseId,
              departmentId: course.departmentId,
              sessionType: 'theory',
              blockingCourseIds: Array.from(blockingCourseIds),
              conflictingStudentCount: totalConflictingStudents,
              reason:
                'Theory slot could not be placed — student conflict across all available slots',
            });

            course.remainingTheoryHours = 0;
          }
        }
        // Priority 2: Practical placement
        else if (course.remainingPracticalHours > 0) {
          for (const [pA, pB] of practicalLabPairOrders) {
            if (placedInThisRound) break;
            for (const day of days) {
              const slotA = slotMap.get(day)?.get(pA);
              const slotB = slotMap.get(day)?.get(pB);
              if (
                slotA &&
                slotB &&
                canPlace(course, [slotA, slotB], studentSlotMap)
              ) {
                place(
                  course,
                  [slotA, slotB],
                  'practical',
                  studentDeptMap,
                  studentSlotMap,
                  assignments
                );
                course.remainingPracticalHours -= 2;
                if (course.remainingPracticalHours < 0) {
                  course.remainingPracticalHours = 0;
                }

                placedInThisRound = true;
                anyPlacedInRound = true;
                break;
              }
            }
          }

          if (!placedInThisRound) {
            // Practical block could not be placed after checking all lab blocks
            const blockingCourseIds = new Set<string>();
            let totalConflictingStudents = 0;

            for (const otherCourse of courses) {
              if (otherCourse.courseId === course.courseId) continue;
              if (sharesStudents(course, otherCourse)) {
                blockingCourseIds.add(otherCourse.courseId);
                totalConflictingStudents += countSharedStudents(
                  course,
                  otherCourse
                );
              }
            }

            conflicts.push({
              courseId: course.courseId,
              departmentId: course.departmentId,
              sessionType: 'practical',
              blockingCourseIds: Array.from(blockingCourseIds),
              conflictingStudentCount: totalConflictingStudents,
              reason:
                'Practical block could not be placed — student conflict across all lab blocks',
            });

            course.remainingPracticalHours = 0;
          }
        }

        if (placedInThisRound) {
          const remainingTotal = courses.reduce(
            (sum, c) => sum + c.remainingTheoryHours + c.remainingPracticalHours,
            0
          );
          const currentlyPlacedHours = totalHours - remainingTotal;
          const pct = Math.min(
            75,
            40 + Math.floor((currentlyPlacedHours / Math.max(1, totalHours)) * 35)
          );
          onProgressSync?.(
            pct,
            `🧠 Allocated ${currentlyPlacedHours}/${totalHours} course hours into grid slots (${phase.name})...`,
            { placedHours: currentlyPlacedHours, totalHours, conflictEdgesCount }
          );
        }
      }

      if (!anyPlacedInRound) {
        for (const course of phase.courses) {
          if (course.remainingTheoryHours > 0) {
            const blockingCourseIds = new Set<string>();
            let totalConflictingStudents = 0;

            for (const otherCourse of courses) {
              if (otherCourse.courseId === course.courseId) continue;
              if (sharesStudents(course, otherCourse)) {
                blockingCourseIds.add(otherCourse.courseId);
                totalConflictingStudents += countSharedStudents(
                  course,
                  otherCourse
                );
              }
            }

            conflicts.push({
              courseId: course.courseId,
              departmentId: course.departmentId,
              sessionType: 'theory',
              blockingCourseIds: Array.from(blockingCourseIds),
              conflictingStudentCount: totalConflictingStudents,
              reason:
                'Theory slot could not be placed — student conflict across all available slots',
            });

            course.remainingTheoryHours = 0;
          }

          if (course.remainingPracticalHours > 0) {
            const blockingCourseIds = new Set<string>();
            let totalConflictingStudents = 0;

            for (const otherCourse of courses) {
              if (otherCourse.courseId === course.courseId) continue;
              if (sharesStudents(course, otherCourse)) {
                blockingCourseIds.add(otherCourse.courseId);
                totalConflictingStudents += countSharedStudents(
                  course,
                  otherCourse
                );
              }
            }

            conflicts.push({
              courseId: course.courseId,
              departmentId: course.departmentId,
              sessionType: 'practical',
              blockingCourseIds: Array.from(blockingCourseIds),
              conflictingStudentCount: totalConflictingStudents,
              reason:
                'Practical block could not be placed — student conflict across all lab blocks',
            });

            course.remainingPracticalHours = 0;
          }
        }
        break;
      }
    }
  }

  const finalRemainingTotal = courses.reduce(
    (sum, c) => sum + c.remainingTheoryHours + c.remainingPracticalHours,
    0
  );
  const finalPlacedHours = totalHours - finalRemainingTotal;

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
