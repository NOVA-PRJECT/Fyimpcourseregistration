# Run Summary: Streamlined Academic Hard Constraints

**Run Timestamp**: 2026-09-02  
**Target File**: [`backend/src/modules/timetable/solver/constraints.base.json`](file:///c:/Users/windows/Fyimpcourseregistration/backend/src/modules/timetable/solver/constraints.base.json)

---

## 1. Objective Completed
Shortened and decluttered the `hard_constraints` list by removing repetitive statements, conversational explanations, redundant rules, and misplaced preferences.

---

## 2. Redundancies Removed

1. **Merged Lab Rules**:
   - *Previous*: 3 separate verbose lines ("Lab blocks must occupy 2 consecutive periods", "A lab block must never span from P3 to P4", "Valid lab blocks are P1+P2, P2+P3, P4+P5, P5+P6 only").
   - *Consolidated*: `Lab blocks must be exactly 2 consecutive periods on the same day (valid: P1+P2, P2+P3, P4+P5, P5+P6 only; never cross lunch)`.
2. **Removed Repetitive Hour Assignments**:
   - *Previous*: 3 separate lines stating theory hours, practical hours, and "Do not assign more slots than a course requires — stop exactly at the required hours".
   - *Consolidated*: `Assign exactly the required theory and practical hours per course (no more, no less)`.
3. **Removed Soft Preferences from Hard Constraints**:
   - Removed `"Lab blocks are preferred in the morning and afternoon (P1+P2, P2+P3, P4+P5, P5+P6)"` (was both redundant with the valid block definition and misplaced as a hard constraint).
   - Moved theory day spreading to `soft_constraints` where it belongs.
4. **Streamlined Parallel Synchronization Paragraph**:
   - *Previous*: 65-word paragraph with conversational rationale ("Parallel Block Synchronization: When elective courses run in parallel... so that no students in the batch are left idle...").
   - *Consolidated*: `Parallel electives for a batch must occupy identical time slots for the full block duration (never pair 1-hour theory with half of a 2-hour lab)`.

---

## 3. Resulting Streamlined Constraints

```json
  "hard_constraints": [
    "No student may have two courses scheduled in the same time slot",
    "No classes during lunch break (12:30 to 13:30)",
    "Lab blocks must be exactly 2 consecutive periods on the same day (valid: P1+P2, P2+P3, P4+P5, P5+P6 only; never cross lunch)",
    "Assign exactly the required theory and practical hours per course (no more, no less)",
    "Use Period 6 only as a last resort",
    "Parallel electives for a batch must occupy identical time slots for the full block duration (never pair 1-hour theory with half of a 2-hour lab)"
  ],
  "soft_constraints": [
    "Single-department courses are preferred in the morning (P1, P2, P3)",
    "Cross-department courses are preferred in the afternoon (P4, P5)",
    "Spread theory hours across different days of the week (avoid multiple theory sessions on the same day)"
  ]
```
