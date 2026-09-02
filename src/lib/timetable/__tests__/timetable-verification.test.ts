import { describe, it, expect } from 'vitest';
import { validateTimetable, violationsToText } from '../validator';
import { CourseNode, SlotMap, AIAssignment, AIGeneratorResponse } from '../types';

function buildSyntheticSlotMap(): SlotMap {
  const slotMap: SlotMap = new Map();
  for (let day = 1; day <= 5; day++) {
    const dayMap = new Map<number, string>();
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
    departmentName: 'Department',
    courseCode: courseId,
    courseTitle: `Course ${courseId}`,
    category,
    theoryHours,
    practicalHours,
    isCrossDept,
    studentIds: new Set(studentIds),
    conflictSummary: '',
  };
}

describe('Timetable System End-to-End Validator Verification', () => {
  const slotMap = buildSyntheticSlotMap();

  it('validates a correct full timetable with lab blocks and theory slots', () => {
    const courses = [
      createCourse('CS101', 'dept_cs', 3, 0, ['s1', 's2']),
      createCourse('CS102_LAB', 'dept_cs', 0, 2, ['s1', 's2']),
    ];

    const response: AIGeneratorResponse = {
      assignments: [
        {
          courseId: 'CS101',
          slots: [
            { day: 1, period: 1, sessionType: 'theory', isLabBlock: false },
            { day: 2, period: 1, sessionType: 'theory', isLabBlock: false },
            { day: 3, period: 1, sessionType: 'theory', isLabBlock: false },
          ],
        },
        {
          courseId: 'CS102_LAB',
          slots: [
            { day: 4, period: 4, sessionType: 'practical', isLabBlock: true },
            { day: 4, period: 5, sessionType: 'practical', isLabBlock: true },
          ],
        },
      ],
    };

    const violations = validateTimetable(response, courses, slotMap);
    expect(violations).toHaveLength(0);
  });

  it('detects odd number of lab slots as invalid lab block', () => {
    const courses = [createCourse('CS102_LAB', 'dept_cs', 0, 2, ['s1'])];

    const response: AIGeneratorResponse = {
      assignments: [
        {
          courseId: 'CS102_LAB',
          slots: [{ day: 1, period: 4, sessionType: 'practical', isLabBlock: true }],
        },
      ],
    };

    const violations = validateTimetable(response, courses, slotMap);
    expect(violations.some((v) => v.type === 'invalid_lab_block')).toBe(true);
  });

  it('detects non-consecutive lab periods as invalid lab block', () => {
    const courses = [createCourse('CS102_LAB', 'dept_cs', 0, 2, ['s1'])];

    const response: AIGeneratorResponse = {
      assignments: [
        {
          courseId: 'CS102_LAB',
          slots: [
            { day: 1, period: 1, sessionType: 'practical', isLabBlock: true },
            { day: 1, period: 3, sessionType: 'practical', isLabBlock: true },
          ],
        },
      ],
    };

    const violations = validateTimetable(response, courses, slotMap);
    expect(violations.some((v) => v.type === 'invalid_lab_block')).toBe(true);
  });

  it('converts violations into clear human-readable text messages', () => {
    const courses = [createCourse('CS101', 'dept_cs', 3, 0, ['s1'])];

    const response: AIGeneratorResponse = {
      assignments: [
        {
          courseId: 'CS101',
          slots: [{ day: 1, period: 1, sessionType: 'theory', isLabBlock: false }],
        },
      ],
    };

    const violations = validateTimetable(response, courses, slotMap);
    const textList = violationsToText(violations);
    expect(textList.length).toBeGreaterThan(0);
    expect(textList[0]).toContain('needs 3 theory hours but got 1');
  });
});
