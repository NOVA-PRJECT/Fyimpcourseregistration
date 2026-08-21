import { describe, it, expect } from 'vitest';
import { validateTimetable } from '../validator';
import { detectParallelGroups } from '../loader';
import { buildTimetablePrompt } from '../prompt-builder';
import type { AIGeneratorResponse, CourseNode, SlotMap } from '../types';

function makeSlotMap(): SlotMap {
  const map: SlotMap = new Map();
  let counter = 1;
  for (let day = 1; day <= 5; day++) {
    const dayMap = new Map<number, string>();
    for (let period = 1; period <= 6; period++) {
      dayMap.set(period, `slot-${counter++}`);
    }
    map.set(day, dayMap);
  }
  return map;
}

describe('AI Timetable Validator (Deterministic)', () => {
  it('validator passes a clean timetable with no violations', () => {
    const courses: CourseNode[] = [
      {
        courseId: 'c1',
        departmentId: 'd1',
        departmentName: 'CS',
        courseCode: 'CS301',
        courseTitle: 'Data Structures',
        category: 'DSC',
        theoryHours: 1,
        practicalHours: 0,
        isCrossDept: false,
        studentIds: new Set(['s1']),
        conflictSummary: 'No conflicts',
      },
    ];

    const response: AIGeneratorResponse = {
      assignments: [
        {
          courseId: 'c1',
          slots: [
            {
              day: 1,
              period: 1,
              sessionType: 'theory',
              isLabBlock: false,
            },
          ],
        },
      ],
    };

    expect(validateTimetable(response, courses, makeSlotMap())).toHaveLength(0);
  });

  it('validator catches student conflict', () => {
    const courses: CourseNode[] = [
      {
        courseId: 'c1',
        departmentId: 'd1',
        departmentName: 'CS',
        courseCode: 'CS301',
        courseTitle: 'Data Structures',
        category: 'DSC',
        theoryHours: 1,
        practicalHours: 0,
        isCrossDept: false,
        studentIds: new Set(['s1']),
        conflictSummary: '',
      },
      {
        courseId: 'c2',
        departmentId: 'd1',
        departmentName: 'CS',
        courseCode: 'CS302',
        courseTitle: 'Algorithms',
        category: 'DSC',
        theoryHours: 1,
        practicalHours: 0,
        isCrossDept: false,
        studentIds: new Set(['s1']), // same student
        conflictSummary: '',
      },
    ];

    const response: AIGeneratorResponse = {
      assignments: [
        {
          courseId: 'c1',
          slots: [{ day: 1, period: 1, sessionType: 'theory', isLabBlock: false }],
        },
        {
          courseId: 'c2',
          slots: [{ day: 1, period: 1, sessionType: 'theory', isLabBlock: false }],
        },
      ],
    };

    const violations = validateTimetable(response, courses, makeSlotMap());
    expect(violations.some((v) => v.type === 'student_conflict')).toBe(true);
  });

  it('validator catches P3+P4 lab block crossing lunch', () => {
    const courses: CourseNode[] = [
      {
        courseId: 'c1',
        departmentId: 'd1',
        departmentName: 'CS',
        courseCode: 'CS301',
        courseTitle: 'Data Structures Lab',
        category: 'DSC',
        theoryHours: 0,
        practicalHours: 2,
        isCrossDept: false,
        studentIds: new Set(['s1']),
        conflictSummary: '',
      },
    ];

    const response: AIGeneratorResponse = {
      assignments: [
        {
          courseId: 'c1',
          slots: [
            { day: 1, period: 3, sessionType: 'practical', isLabBlock: true },
            { day: 1, period: 4, sessionType: 'practical', isLabBlock: true },
          ],
        },
      ],
    };

    const violations = validateTimetable(response, courses, makeSlotMap());
    expect(violations.some((v) => v.type === 'lunch_overlap')).toBe(true);
  });

  it('validator catches hours mismatch', () => {
    const courses: CourseNode[] = [
      {
        courseId: 'c1',
        departmentId: 'd1',
        departmentName: 'CS',
        courseCode: 'CS301',
        courseTitle: 'Data Structures',
        category: 'DSC',
        theoryHours: 3,
        practicalHours: 0,
        isCrossDept: false,
        studentIds: new Set(['s1']),
        conflictSummary: '',
      },
    ];

    const response: AIGeneratorResponse = {
      assignments: [
        {
          courseId: 'c1',
          slots: [{ day: 1, period: 1, sessionType: 'theory', isLabBlock: false }], // only 1, needs 3
        },
      ],
    };

    const violations = validateTimetable(response, courses, makeSlotMap());
    expect(violations.some((v) => v.type === 'hours_mismatch')).toBe(true);
  });

  it('validator catches half_block_overlap when theory course runs in only 1 period of a 2h lab block', () => {
    const courses: CourseNode[] = [
      {
        courseId: 'c_lab',
        departmentId: 'd_eco',
        departmentName: 'Economics',
        courseCode: 'KU01DSCCSE101',
        courseTitle: 'Principles of Programming Lab',
        category: 'DSC',
        theoryHours: 0,
        practicalHours: 2,
        isCrossDept: false,
        studentIds: new Set(['s1']),
        conflictSummary: '',
      },
      {
        courseId: 'c_theory',
        departmentId: 'd_eco',
        departmentName: 'Economics',
        courseCode: 'KU01DSCECO101',
        courseTitle: 'Introduction to Economics',
        category: 'DSC',
        theoryHours: 1,
        practicalHours: 0,
        isCrossDept: false,
        studentIds: new Set(['s2']), // different student, same dept
        conflictSummary: '',
      },
    ];

    const response: AIGeneratorResponse = {
      assignments: [
        {
          courseId: 'c_lab',
          slots: [
            { day: 1, period: 4, sessionType: 'practical', isLabBlock: true },
            { day: 1, period: 5, sessionType: 'practical', isLabBlock: true },
          ],
        },
        {
          courseId: 'c_theory',
          slots: [
            { day: 1, period: 4, sessionType: 'theory', isLabBlock: false }, // only in P4, not in P5!
          ],
        },
      ],
    };

    const violations = validateTimetable(response, courses, makeSlotMap());
    expect(violations.some((v) => v.type === 'half_block_overlap')).toBe(true);
  });
});

describe('detectParallelGroups', () => {
  it('detects parallel groups with zero student overlap and matching hours structure', () => {
    const courses: CourseNode[] = [
      {
        courseId: 'c1',
        departmentId: 'd1',
        departmentName: 'CS',
        courseCode: 'CS301A',
        courseTitle: 'Elective A',
        category: 'DSC',
        theoryHours: 3,
        practicalHours: 0,
        isCrossDept: false,
        studentIds: new Set(['s1', 's2']),
        conflictSummary: '',
      },
      {
        courseId: 'c2',
        departmentId: 'd1',
        departmentName: 'CS',
        courseCode: 'CS301B',
        courseTitle: 'Elective B',
        category: 'DSC',
        theoryHours: 3,
        practicalHours: 0,
        isCrossDept: false,
        studentIds: new Set(['s3', 's4']),
        conflictSummary: '',
      },
    ];

    const groups = detectParallelGroups(courses);
    expect(groups).toHaveLength(1);
    expect(groups[0].courseCodes).toEqual(['CS301A', 'CS301B']);
  });

  it('does not group courses if they share even one student', () => {
    const courses: CourseNode[] = [
      {
        courseId: 'c1',
        departmentId: 'd1',
        departmentName: 'CS',
        courseCode: 'CS301A',
        courseTitle: 'Elective A',
        category: 'DSC',
        theoryHours: 3,
        practicalHours: 0,
        isCrossDept: false,
        studentIds: new Set(['s1', 's2']),
        conflictSummary: '',
      },
      {
        courseId: 'c2',
        departmentId: 'd1',
        departmentName: 'CS',
        courseCode: 'CS301B',
        courseTitle: 'Elective B',
        category: 'DSC',
        theoryHours: 3,
        practicalHours: 0,
        isCrossDept: false,
        studentIds: new Set(['s2', 's3']), // shared s2
        conflictSummary: '',
      },
    ];

    const groups = detectParallelGroups(courses);
    expect(groups).toHaveLength(0);
  });
});

describe('Compact Prompt & Compact JSON Parsing', () => {
  it('builds concise compact prompt with alias mappings', () => {
    const courses: CourseNode[] = [
      {
        courseId: 'uuid-1234',
        departmentId: 'd1',
        departmentName: 'CS',
        courseCode: 'CS101',
        courseTitle: 'Intro',
        category: 'DSC',
        theoryHours: 2,
        practicalHours: 0,
        isCrossDept: false,
        studentIds: new Set(['s1']),
        conflictSummary: 'No conflicts',
      },
    ];

    const idMap = new Map<string, string>([['uuid-1234', 'C1']]);
    const prompt = buildTimetablePrompt(courses, [], [], 1, idMap);

    expect(prompt).toContain('C1 (CS101 - Intro): T=2h, P=0h');
    expect(prompt).toContain('Response Format (JSON ONLY)');
    expect(prompt.length).toBeLessThan(2000);
  });
});

