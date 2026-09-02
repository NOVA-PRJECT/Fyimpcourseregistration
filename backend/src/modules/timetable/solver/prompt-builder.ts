import baseConstraints from './constraints.base.json';
import type { CourseNode, ParallelGroup, DynamicConstraint } from './types';

export function buildTimetablePrompt(
  courses: CourseNode[],
  parallelGroups: ParallelGroup[],
  dynamicConstraints: DynamicConstraint[],
  semester?: number,
  idMap?: Map<string, string>
): string {
  const sections: string[] = [];

  // Use provided idMap or build default C1, C2... mapping
  const activeIdMap = idMap || new Map<string, string>();
  if (!idMap) {
    courses.forEach((c, i) => {
      activeIdMap.set(c.courseId, `C${i + 1}`);
    });
  }

  // Load semester-specific base constraints if defined
  const rawBase: any = baseConstraints;
  const semKey = semester ? String(semester) : null;
  const semBase = semKey && rawBase.semester_constraints?.[semKey] ? rawBase.semester_constraints[semKey] : null;

  const hardConstraintsList = [
    ...(rawBase.hard_constraints || []),
    ...(semBase?.hard_constraints || []),
  ];

  const softConstraintsList = [
    ...(rawBase.soft_constraints || []),
    ...(semBase?.soft_constraints || []),
  ];

  // ── Header & Structure ────────────────────────────────────────────────────────
  sections.push(`You are an expert university timetable scheduler for Kannur University FYIMP.`);
  sections.push(`Assign weekly time slots (Monday 1 to Friday 5, Periods 1 to 6) to all courses.`);
  sections.push(`Lunch break: 12:30–13:30 (between P3 and P4). No classes during lunch.`);

  // ── Compact Invariants & Rules ────────────────────────────────────────────────
  sections.push(`## Core Rules:
1. [HARD] Student No-Overlap: No two courses sharing enrolled students may share a time slot (see Conflicts list).
2. [HARD] Exact Hours: Allocate exactly T theory slots and P practical slots per course.
3. [HARD] 2h Lab Blocks (L): Practical hours must be paired as consecutive periods on the same day (P1+P2, P2+P3, P4+P5, P5+P6). Both slots marked "L".
4. [HARD] Parallel Electives: Courses in the same Parallel Group MUST be assigned identical time slots.
5. [SOFT] Distribution: Distribute multi-hour theory courses across distinct days.`);

  // ── Custom Dynamic Constraints ────────────────────────────────────────────────
  if (dynamicConstraints.length > 0) {
    const lines = dynamicConstraints.map(
      (c, i) => `- [${c.category === 'soft' ? 'SOFT' : 'HARD'}] ${c.text}`
    );
    sections.push(`## Custom Constraints for Semester ${semester || 1}:\n${lines.join('\n')}`);
  }

  // ── Parallel Groups ───────────────────────────────────────────────────────────
  if (parallelGroups.length > 0) {
    const groupLines = parallelGroups.map((g, i) => {
      const aliases = g.courseIds.map((id) => activeIdMap.get(id) || id);
      return `Group ${i + 1}: [${aliases.join(', ')}] (${g.courseCodes.join(' / ')}) — MUST share identical slots.`;
    });
    sections.push(`## Elective Parallel Groups:\n${groupLines.join('\n')}`);
  }

  // ── Compact Course List ───────────────────────────────────────────────────────
  const courseLines = courses.map((c) => {
    const alias = activeIdMap.get(c.courseId) || c.courseId;
    const conflictAliases = courses
      .filter((other) => other.courseId !== c.courseId && [...c.studentIds].some((s) => other.studentIds.has(s)))
      .map((other) => activeIdMap.get(other.courseId) || other.courseId);

    const confStr = conflictAliases.length > 0 ? `Conflicts: [${conflictAliases.join(',')}]` : 'No conflicts';
    return `${alias} (${c.courseCode} - ${c.courseTitle}): T=${c.theoryHours}h, P=${c.practicalHours}h. ${confStr}`;
  });
  sections.push(`## Courses to Schedule (${courses.length} courses):\n${courseLines.join('\n')}`);

  // ── Ultra-Compact Output Format ───────────────────────────────────────────────
  sections.push(`## Response Format (JSON ONLY):
Respond with a JSON object containing "assignments" and optional "unplaced" list (if any course cannot be placed without violating hard constraints, explain the exact real conflict reason):
{
  "assignments": [
    {"c": "C1", "s": [[1, 2, "T"], [3, 1, "T"], [2, 4, "L"], [2, 5, "L"]]},
    {"c": "C2", "s": [[1, 1, "T"], [4, 3, "T"]]}
  ],
  "unplaced": [
    {"c": "C3", "reason": "Student schedule clash with C1 on Mon/Wed and C2 on Tue in all available slots"}
  ]
}
Slot format: [day (1-5), period (1-6), "T" (Theory) or "L" (Lab)].
If all courses are placed successfully, "unplaced" can be empty []. No markdown, no commentary.`);

  return sections.join('\n\n');
}

export function buildCorrectionPrompt(violations: string[], previousResponse: string): string {
  return `Your previous schedule had ${violations.length} constraint violation(s):
${violations.slice(0, 10).map((v, i) => `${i + 1}. ${v}`).join('\n')}

Previous assignments for reference:
${previousResponse.slice(0, 1500)}

Please fix the violations and return the complete corrected JSON array in the exact same compact format:
[{"c": "C1", "s": [[day, period, "T"|"L"], ...]}, ...]`;
}
