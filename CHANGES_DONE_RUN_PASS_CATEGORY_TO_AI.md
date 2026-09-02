# Run Summary: Passed Course Category to AI Timetable Prompt

**Run Timestamp**: 2026-09-02  
**Target File**: [`backend/src/modules/timetable/solver/prompt-builder.ts`](file:///c:/Users/windows/Fyimpcourseregistration/backend/src/modules/timetable/solver/prompt-builder.ts)

---

## 1. Objective Completed
Added the course category tag (e.g. `[DSC]`, `[MDC]`, `[VAC]`, `[AEC]`) to the prompt sent to the AI scheduler for each course in the scheduling list.

---

## 2. Changes Made
In `prompt-builder.ts`:
- Formatted each course entry to include its category:
  ```typescript
  const catStr = c.category ? ` [${c.category}]` : '';
  return `${alias} (${c.courseCode} - ${c.courseTitle}${catStr}): T=${c.theoryHours}h, P=${c.practicalHours}h. ${confStr}`;
  ```
- Example output passed to AI:
  ```text
  C1 (CS101 - Programming in C [DSC]): T=3h, P=2h. Conflicts: [C2, C4]
  C2 (MATH101 - Calculus [MDC]): T=3h, P=0h. Conflicts: [C1]
  ```

---

## 3. Benefits
1. The AI model now has clear visibility into curricular course classifications (Major Core / Multidisciplinary / Value Added / Ability Enhancement).
2. Allows the AI scheduler to align with category preferences (such as scheduling MDC cross-departmental electives in afternoon slots).
