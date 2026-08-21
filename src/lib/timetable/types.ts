export type SlotId = string; // uuid of time_slots row

export interface ParallelGroup {
  groupId: string;
  departmentId: string;
  courseIds: string[]; // all course IDs in this group
}

export interface CourseNode {
  courseId: string;
  departmentId: string;
  category: string; // from courses.category e.g. 'DSE', 'SEC', 'VAC'
  theoryHours: number;
  practicalHours: number;
  remainingTheoryHours: number;
  remainingPracticalHours: number;
  isCrossDept: boolean; // true if students come from >1 department
  studentIds: Set<string>;
  conflictsWith: Set<string>; // courseIds that share at least one student
}

export interface SlotAssignment {
  courseId: string;
  departmentId: string;
  timeSlotId: SlotId;
  isLabBlock: boolean; // true = this entry represents a 2hr lab block
  sessionType: 'theory' | 'practical';
}

export interface GenerationResult {
  assignments: SlotAssignment[];
  conflicts: UnresolvableCourse[];
}

export interface UnresolvableCourse {
  courseId: string;
  departmentId: string;
  sessionType: 'theory' | 'practical';
  blockingCourseIds: string[];
  conflictingStudentCount: number;
  reason: string;
}

// Slot ordering constants
export const MORNING_PERIODS = [1, 2, 3]; // 9:30–12:30
export const AFTERNOON_PERIODS = [4, 5]; // 13:30–15:30
export const EXTENDED_PERIOD = 6; // 15:30–16:30

// Valid 2-hour lab blocks (period pairs). P3+P4 is ILLEGAL (crosses lunch).
export const LAB_BLOCK_PAIRS: [number, number][] = [
  [1, 2], // 9:30–11:30
  [2, 3], // 10:30–12:30
  [4, 5], // 13:30–15:30
  [5, 6], // 14:30–16:30
];

export const DAYS = [1, 2, 3, 4, 5]; // Mon–Fri

// Categories that are campus-wide synchronized and slot-exclusive
export const CAMPUS_SYNC_EXCLUSIVE = ['AEC', 'VAC', 'SEC'] as const;

// Valid consecutive theory block period combinations (never P3→P4, crosses lunch)
// Format: [periodStart, ...periods]
export const THEORY_BLOCKS: Record<number, number[][]> = {
  1: [[4], [5], [6], [1], [2], [3]], // 1-hour: afternoon preferred
  2: [[4, 5], [5, 6]], // 2-hour: strictly afternoon consecutive pairs
  3: [[4, 5, 6]], // 3-hour: strictly full afternoon
};
