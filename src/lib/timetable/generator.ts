import {
  CAMPUS_SYNC_EXCLUSIVE,
  CourseNode,
  DAYS,
  GenerationResult,
  ParallelGroup,
  SlotAssignment,
  SlotId,
  THEORY_BLOCKS,
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

function canPlaceAll(
  courses: CourseNode[],
  slotIds: SlotId[],
  studentSlotMap: Map<string, Set<SlotId>>
): boolean {
  for (const course of courses) {
    if (!canPlace(course, slotIds, studentSlotMap)) return false;
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
  const affectedDeptIds = new Set<string>();
  for (const studentId of course.studentIds) {
    const deptId = studentDeptMap.get(studentId);
    if (deptId) affectedDeptIds.add(deptId);
  }

  // Fallback: If no students mapped or zero-student course, use course offering department
  if (affectedDeptIds.size === 0) {
    affectedDeptIds.add(course.departmentId);
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

function getTheoryBlockSlots(
  blockSize: number,
  slotMap: Map<number, Map<number, SlotId>>
): Array<{ day: number; slotIds: SlotId[] }> {
  const periodGroups = THEORY_BLOCKS[blockSize];
  if (!periodGroups) return [];
  const result: Array<{ day: number; slotIds: SlotId[] }> = [];
  for (const day of DAYS) {
    for (const periods of periodGroups) {
      const slotIds = periods
        .map((p) => slotMap.get(day)?.get(p))
        .filter((id): id is SlotId => id !== undefined);
      if (slotIds.length === periods.length) {
        result.push({ day, slotIds });
      }
    }
  }
  return result;
}

function placeCampusSyncExclusive(
  courses: CourseNode[],
  slotMap: Map<number, Map<number, SlotId>>,
  studentDeptMap: Map<string, string>,
  studentSlotMap: Map<string, Set<SlotId>>,
  exclusiveSlotMap: Map<SlotId, string>,
  assignments: SlotAssignment[],
  conflicts: UnresolvableCourse[]
): void {
  // Group all CSE courses by category (across all departments)
  const categoryBuckets = new Map<string, CourseNode[]>();
  for (const course of courses) {
    if (!(CAMPUS_SYNC_EXCLUSIVE as readonly string[]).includes(course.category)) {
      continue;
    }
    if (!categoryBuckets.has(course.category)) {
      categoryBuckets.set(course.category, []);
    }
    categoryBuckets.get(course.category)!.push(course);
  }

  for (const [category, categoryCourses] of categoryBuckets) {
    if (categoryCourses.length === 0) continue;

    // All courses in this category should have the same theory_hours_per_week
    // Use the first course's hours as the block size
    const blockSize = categoryCourses[0].theoryHours;
    if (blockSize === 0) {
      // No theory hours — skip theory placement, handle practical below
    } else if (blockSize > 3) {
      // Block scheduling only supports up to 3 consecutive hours
      for (const course of categoryCourses) {
        conflicts.push({
          courseId: course.courseId,
          departmentId: course.departmentId,
          sessionType: 'theory',
          blockingCourseIds: [],
          conflictingStudentCount: course.studentIds.size,
          reason: `${category} block scheduling not supported for ${blockSize} theory hours — max is 3`,
        });
        course.remainingTheoryHours = 0;
      }
    } else {
      // Get all valid blocks for this size
      const validBlocks = getTheoryBlockSlots(blockSize, slotMap);
      let placed = false;
      for (const { slotIds } of validBlocks) {
        // Skip if any slot in this block is already exclusive for a DIFFERENT category
        const blockedByOther = slotIds.some(
          (sid) => exclusiveSlotMap.has(sid) && exclusiveSlotMap.get(sid) !== category
        );
        if (blockedByOther) continue;

        // Check all courses across all departments can be placed in this block
        if (!canPlaceAll(categoryCourses, slotIds, studentSlotMap)) continue;

        // Place ALL courses in this category into this block
        for (const course of categoryCourses) {
          place(course, slotIds, 'theory', studentDeptMap, studentSlotMap, assignments);
          course.remainingTheoryHours = 0;
        }

        // Mark ALL slots in this block as exclusive for this category
        for (const slotId of slotIds) {
          exclusiveSlotMap.set(slotId, category);
        }
        placed = true;
        break;
      }

      if (!placed) {
        for (const course of categoryCourses) {
          conflicts.push({
            courseId: course.courseId,
            departmentId: course.departmentId,
            sessionType: 'theory',
            blockingCourseIds: [...course.conflictsWith],
            conflictingStudentCount: course.studentIds.size,
            reason: `${category} campus-sync block could not be placed — all valid blocks occupied or conflicted`,
          });
          course.remainingTheoryHours = 0;
        }
      }
    }

    // Handle practical hours for CSE courses (if any exist)
    const hasPractical = categoryCourses.some((c) => c.remainingPracticalHours > 0);
    if (hasPractical) {
      // Try lab blocks in afternoon-first order
      const labBlockOrder: [number, number][] = [
        ...DAYS.map((d) => [d, 4] as [number, number]), // P4+P5 all days
        ...DAYS.map((d) => [d, 5] as [number, number]), // P5+P6 all days
        ...DAYS.map((d) => [d, 1] as [number, number]), // P1+P2 all days
        ...DAYS.map((d) => [d, 2] as [number, number]), // P2+P3 all days
      ];

      while (categoryCourses.some((c) => c.remainingPracticalHours > 0)) {
        let placed = false;
        for (const [day, startPeriod] of labBlockOrder) {
          const slotA = slotMap.get(day)?.get(startPeriod);
          const slotB = slotMap.get(day)?.get(startPeriod + 1);
          if (!slotA || !slotB) continue;
          const slotIds = [slotA, slotB];

          const blockedByOther = slotIds.some(
            (sid) => exclusiveSlotMap.has(sid) && exclusiveSlotMap.get(sid) !== category
          );
          if (blockedByOther) continue;
          if (!canPlaceAll(categoryCourses, slotIds, studentSlotMap)) continue;

          for (const course of categoryCourses) {
            if (course.remainingPracticalHours <= 0) continue;
            place(course, slotIds, 'practical', studentDeptMap, studentSlotMap, assignments);
            course.remainingPracticalHours = Math.max(0, course.remainingPracticalHours - 2);
          }

          for (const slotId of slotIds) {
            exclusiveSlotMap.set(slotId, category);
          }
          placed = true;
          break;
        }

        if (!placed) {
          for (const course of categoryCourses) {
            if (course.remainingPracticalHours > 0) {
              conflicts.push({
                courseId: course.courseId,
                departmentId: course.departmentId,
                sessionType: 'practical',
                blockingCourseIds: [],
                conflictingStudentCount: course.studentIds.size,
                reason: `${category} campus-sync practical block could not be placed`,
              });
              course.remainingPracticalHours = 0;
            }
          }
          break;
        }
      }
    }
  }
}

function findTheorySlotForGroup(
  groupNodes: CourseNode[],
  slotMap: Map<number, Map<number, SlotId>>,
  studentSlotMap: Map<string, Set<SlotId>>,
  preferAfternoon: boolean,
  usedDays: Set<number>,
  exclusiveSlotMap?: Map<SlotId, string>
): { slotId: SlotId; day: number } | null {
  const allDays = [1, 2, 3, 4, 5];
  // Day spreading: prefer days not yet used for this parallel group
  const sortedDays = [
    ...allDays.filter((d) => !usedDays.has(d)),
    ...allDays.filter((d) => usedDays.has(d)),
  ];

  const theoryPeriods = preferAfternoon
    ? [4, 5, 1, 2, 3, 6]
    : [1, 2, 3, 4, 5, 6];

  for (const day of sortedDays) {
    for (const period of theoryPeriods) {
      const slotId = slotMap.get(day)?.get(period);
      if (!slotId) continue;

      // Exclusive slot check
      if (exclusiveSlotMap) {
        const slotCategory = exclusiveSlotMap.get(slotId);
        if (
          slotCategory !== undefined &&
          !groupNodes.some((c) => c.category === slotCategory)
        ) {
          continue;
        }
      }

      if (canPlaceAll(groupNodes, [slotId], studentSlotMap)) {
        return { slotId, day };
      }
    }
  }
  return null;
}

function findLabBlockForGroup(
  groupNodes: CourseNode[],
  slotMap: Map<number, Map<number, SlotId>>,
  studentSlotMap: Map<string, Set<SlotId>>,
  exclusiveSlotMap?: Map<SlotId, string>
): SlotId[] | null {
  const days = [1, 2, 3, 4, 5];
  const practicalLabPairOrders: [number, number][] = [
    [4, 5],
    [5, 6],
    [1, 2],
    [2, 3],
  ];

  for (const [pA, pB] of practicalLabPairOrders) {
    for (const day of days) {
      const slotA = slotMap.get(day)?.get(pA);
      const slotB = slotMap.get(day)?.get(pB);
      if (!slotA || !slotB) continue;

      if (exclusiveSlotMap) {
        const blockReserved = [slotA, slotB].some((sid) => {
          const cat = exclusiveSlotMap.get(sid);
          return (
            cat !== undefined && !groupNodes.some((c) => c.category === cat)
          );
        });
        if (blockReserved) continue;
      }

      if (canPlaceAll(groupNodes, [slotA, slotB], studentSlotMap)) {
        return [slotA, slotB];
      }
    }
  }
  return null;
}

function placeParallelGroups(
  parallelGroups: ParallelGroup[],
  groupedCourses: CourseNode[],
  slotMap: Map<number, Map<number, SlotId>>,
  studentDeptMap: Map<string, string>,
  studentSlotMap: Map<string, Set<SlotId>>,
  assignments: SlotAssignment[],
  conflicts: UnresolvableCourse[],
  exclusiveSlotMap?: Map<SlotId, string>
): void {
  for (const group of parallelGroups) {
    const groupNodes = group.courseIds
      .map((id) => groupedCourses.find((c) => c.courseId === id))
      .filter(Boolean) as CourseNode[];

    if (groupNodes.length === 0) continue;

    const anyCrossDept = groupNodes.some((c) => c.isCrossDept);
    const groupUsedDays = new Set<number>();

    // Theory placement rounds
    while (groupNodes.some((n) => n.remainingTheoryHours > 0)) {
      const result = findTheorySlotForGroup(
        groupNodes,
        slotMap,
        studentSlotMap,
        anyCrossDept,
        groupUsedDays,
        exclusiveSlotMap
      );

      if (result) {
        // Assign this slot to ALL courses in the group that still need theory hours
        for (const node of groupNodes) {
          if (node.remainingTheoryHours <= 0) continue;
          place(node, [result.slotId], 'theory', studentDeptMap, studentSlotMap, assignments);
          node.remainingTheoryHours -= 1;
        }
        groupUsedDays.add(result.day);
      } else {
        // Cannot place — mark all unresolvable for theory
        for (const node of groupNodes) {
          if (node.remainingTheoryHours > 0) {
            conflicts.push({
              courseId: node.courseId,
              departmentId: node.departmentId,
              sessionType: 'theory',
              blockingCourseIds: Array.from(node.conflictsWith),
              conflictingStudentCount: node.studentIds.size,
              reason: `${node.remainingTheoryHours} parallel group theory hour(s) could not be placed — all candidate slots blocked by student schedule conflicts`,
            });
            node.remainingTheoryHours = 0;
          }
        }
        break;
      }
    }

    // Practical placement rounds
    while (groupNodes.some((n) => n.remainingPracticalHours > 0)) {
      const block = findLabBlockForGroup(
        groupNodes,
        slotMap,
        studentSlotMap,
        exclusiveSlotMap
      );

      if (block) {
        for (const node of groupNodes) {
          if (node.remainingPracticalHours <= 0) continue;
          place(node, block, 'practical', studentDeptMap, studentSlotMap, assignments);
          node.remainingPracticalHours -= 2;
          if (node.remainingPracticalHours < 0) node.remainingPracticalHours = 0;
        }
      } else {
        for (const node of groupNodes) {
          if (node.remainingPracticalHours > 0) {
            conflicts.push({
              courseId: node.courseId,
              departmentId: node.departmentId,
              sessionType: 'practical',
              blockingCourseIds: Array.from(node.conflictsWith),
              conflictingStudentCount: node.studentIds.size,
              reason: `${node.remainingPracticalHours} parallel group practical hour(s) could not be placed — all lab blocks blocked`,
            });
            node.remainingPracticalHours = 0;
          }
        }
        break;
      }
    }
  }
}

export function generateTimetable(
  courses: CourseNode[],
  slotMap: Map<number, Map<number, SlotId>>, // slotMap[day][period] = uuid
  studentDeptMap: Map<string, string> = new Map(), // studentId -> departmentId
  parallelGroups: ParallelGroup[] = [],
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

  // Exclusive slot map: SlotId -> category string ('AEC', 'VAC', 'SEC')
  const exclusiveSlotMap = new Map<SlotId, string>();

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

  // 2. Split courses into pools
  const cseCategories = new Set(CAMPUS_SYNC_EXCLUSIVE as readonly string[]);
  const cseCourses = courses.filter((c) => cseCategories.has(c.category));
  const nonCseCourses = courses.filter((c) => !cseCategories.has(c.category));
  const groupedCourseIds = new Set(parallelGroups.flatMap((g) => g.courseIds));

  const phase1Courses = nonCseCourses.filter(
    (c) => !c.isCrossDept && !groupedCourseIds.has(c.courseId)
  );
  const phase2Courses = nonCseCourses.filter(
    (c) => c.isCrossDept && !groupedCourseIds.has(c.courseId)
  );
  const parallelGroupCourses = nonCseCourses.filter(
    (c) => groupedCourseIds.has(c.courseId)
  );

  // PRE-PHASE 0: campus-sync exclusive (AEC, VAC, SEC)
  placeCampusSyncExclusive(
    cseCourses,
    slotMap,
    studentDeptMap,
    studentSlotMap,
    exclusiveSlotMap,
    assignments,
    conflicts
  );

  // PRE-PHASE A: parallel groups (non-CSE categories)
  placeParallelGroups(
    parallelGroups,
    parallelGroupCourses,
    slotMap,
    studentDeptMap,
    studentSlotMap,
    assignments,
    conflicts,
    exclusiveSlotMap
  );

  const phases = [
    {
      name: 'Single-Department Courses',
      courses: phase1Courses,
      theoryPeriods: [1, 2, 3, 4, 5, 6], // Morning first [1,2,3], then [4,5,6]
    },
    {
      name: 'Cross-Department Courses',
      courses: phase2Courses,
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
              if (!slotId) continue;

              // Exclusive slot check
              const slotCategory = exclusiveSlotMap.get(slotId);
              if (
                slotCategory !== undefined &&
                slotCategory !== course.category
              ) {
                continue; // slot reserved for a different CSE category
              }

              if (canPlace(course, [slotId], studentSlotMap)) {
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
        }
        // Priority 2: Practical placement
        else if (course.remainingPracticalHours > 0) {
          for (const [pA, pB] of practicalLabPairOrders) {
            if (placedInThisRound) break;
            for (const day of days) {
              const slotA = slotMap.get(day)?.get(pA);
              const slotB = slotMap.get(day)?.get(pB);
              if (!slotA || !slotB) continue;

              // Exclusive slot check
              const blockReserved = [slotA, slotB].some((sid) => {
                const cat = exclusiveSlotMap.get(sid);
                return cat !== undefined && cat !== course.category;
              });
              if (blockReserved) continue;

              if (canPlace(course, [slotA, slotB], studentSlotMap)) {
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

      // If a full round across all departments made zero placements, attempt fallback placement before giving up
      if (!anyPlacedInRound) {
        for (const course of phase.courses) {
          // Exhaustive theory fallback attempt: check any day and any period [1..6]
          while (course.remainingTheoryHours > 0) {
            let fallbackPlaced = false;
            for (const day of days) {
              if (fallbackPlaced) break;
              for (const period of [1, 2, 3, 4, 5, 6]) {
                const slotId = slotMap.get(day)?.get(period);
                if (!slotId) continue;

                // Exclusive slot check
                const slotCategory = exclusiveSlotMap.get(slotId);
                if (
                  slotCategory !== undefined &&
                  slotCategory !== course.category
                ) {
                  continue;
                }

                if (canPlace(course, [slotId], studentSlotMap)) {
                  place(
                    course,
                    [slotId],
                    'theory',
                    studentDeptMap,
                    studentSlotMap,
                    assignments
                  );
                  course.remainingTheoryHours -= 1;
                  fallbackPlaced = true;
                  break;
                }
              }
            }

            if (!fallbackPlaced) {
              // Genuinely no slot in the entire week is free for this course's students
              const blockingCourseIds = new Set<string>();

              for (const otherCourse of courses) {
                if (otherCourse.courseId === course.courseId) continue;
                if (sharesStudents(course, otherCourse)) {
                  blockingCourseIds.add(otherCourse.courseId);
                }
              }

              conflicts.push({
                courseId: course.courseId,
                departmentId: course.departmentId,
                sessionType: 'theory',
                blockingCourseIds: Array.from(blockingCourseIds),
                conflictingStudentCount: course.studentIds.size,
                reason: `${course.remainingTheoryHours} theory hour(s) could not be placed — all available time slots blocked by student schedule conflicts`,
              });

              course.remainingTheoryHours = 0;
            }
          }

          // Exhaustive practical fallback attempt: check all valid lab pairs across all days
          while (course.remainingPracticalHours > 0) {
            let fallbackPlaced = false;
            for (const [pA, pB] of practicalLabPairOrders) {
              if (fallbackPlaced) break;
              for (const day of days) {
                const slotA = slotMap.get(day)?.get(pA);
                const slotB = slotMap.get(day)?.get(pB);
                if (!slotA || !slotB) continue;

                const blockReserved = [slotA, slotB].some((sid) => {
                  const cat = exclusiveSlotMap.get(sid);
                  return cat !== undefined && cat !== course.category;
                });
                if (blockReserved) continue;

                if (canPlace(course, [slotA, slotB], studentSlotMap)) {
                  place(
                    course,
                    [slotA, slotB],
                    'practical',
                    studentDeptMap,
                    studentSlotMap,
                    assignments
                  );
                  course.remainingPracticalHours -= 2;
                  if (course.remainingPracticalHours < 0) course.remainingPracticalHours = 0;
                  fallbackPlaced = true;
                  break;
                }
              }
            }

            if (!fallbackPlaced) {
              const blockingCourseIds = new Set<string>();

              for (const otherCourse of courses) {
                if (otherCourse.courseId === course.courseId) continue;
                if (sharesStudents(course, otherCourse)) {
                  blockingCourseIds.add(otherCourse.courseId);
                }
              }

              conflicts.push({
                courseId: course.courseId,
                departmentId: course.departmentId,
                sessionType: 'practical',
                blockingCourseIds: Array.from(blockingCourseIds),
                conflictingStudentCount: course.studentIds.size,
                reason: `${course.remainingPracticalHours} practical hour(s) could not be placed — all valid 2-hour lab blocks blocked by student schedule conflicts`,
              });

              course.remainingPracticalHours = 0;
            }
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
