# Run Changes: Course Allocation System V2 (Preferences Separation & Rules Engine)

**Date**: 2026-09-09  
**Branch / Workspace**: `Fyimpcourseregistration`  
**Status**: Completed & Verified (`nest build` and `next build` passed with zero errors)

---

## 1. Objectives & Overview
This update addresses the two architectural issues identified during previous system testing:
1. **Fix 1 — Separation of Concerns (Two Tables)**:
   - Separated temporary student elective preference submissions during open windows from official, confirmed course registrations.
   - Introduced `registration_preferences` table with a unified slot preference structure (`[{ slot, rule, is_fixed, choices }]`), `allocation_metadata`, and a frozen `submitted_at` timestamp.
   - Kept `student_registrations` exclusively for confirmed student allocations (`slot_1_course_id` through `slot_6_course_id`).
   - Fixed slot write-through: Fixed slots write directly to `student_registrations` and deduct from course capacity before elective allocation rounds start.
2. **Fix 2 — Flexible Prerequisite Rules Engine**:
   - Replaced rigid UUID prerequisite course arrays with the `course_prerequisite_rules` table.
   - Implemented three extensible rule types (`COMPLETED_COURSE`, `COMPLETED_SEMESTER`, `DEPARTMENT`) scoring +1 point each when satisfied.
   - Maintained semester proximity points: `max(0, student_semester - course_semester)`.
   - Courses with no rules score 0 points (never disqualified).

---

## 2. Detailed Changes By File

### Database Migration
- **[`supabase/migrations/20260909_course_allocation_v2_rules_and_preferences.sql`](file:///c:/Users/windows/Fyimpcourseregistration/supabase/migrations/20260909_course_allocation_v2_rules_and_preferences.sql)**:
  - Created `registration_preferences` table with `UNIQUE(student_id, semester, academic_year)` and indexes on `(campus_id, academic_year, semester)`.
  - Created `course_prerequisite_rules` table with `UNIQUE(course_id, rule, target)` and index on `course_id`.
  - Added RLS policies for authenticated access.
  - Updated `apply_course_allocation` atomic PostgreSQL RPC function to commit winning elective assignments to `student_registrations` while updating `allocation_metadata` (`rank_1`, `rank_2`, `rank_3`, or `unallocated`) in `registration_preferences`.

### Backend
- **[`backend/src/modules/allocation/allocation.controller.ts`](file:///c:/Users/windows/Fyimpcourseregistration/backend/src/modules/allocation/allocation.controller.ts)**:
  - Added `GET /api/allocation/config/prerequisites/:courseId`
  - Added `POST /api/allocation/config/prerequisites/:courseId`
  - Added `DELETE /api/allocation/config/prerequisites/:ruleId`
- **[`backend/src/modules/allocation/allocation.service.ts`](file:///c:/Users/windows/Fyimpcourseregistration/backend/src/modules/allocation/allocation.service.ts)**:
  - Implemented `getPrerequisites`, `addPrerequisite`, and `deletePrerequisite` with role and department ownership checks.
  - Refactored `runAllocation`:
    - Reads candidate students exclusively from `registration_preferences` (ignoring legacy pre-allocation records).
    - Fetches prior completed course codes for `COMPLETED_COURSE` rule matching.
    - Evaluates `COMPLETED_COURSE`, `COMPLETED_SEMESTER`, and `DEPARTMENT` rules (+1 pt each) + proximity points.
    - Implemented Step 1: Fixed slot write-through directly to `student_registrations`, deducting capacity before round 1.
    - Implemented Steps 2 & 3: 3-round elective allocation with tiebreaker `submitted_at ASC`.
    - Handles unallocated elective slots explicitly with `allocated_by: 'unallocated'`.
  - Refactored `getUnresolvedStudents`:
    - Queries `registration_preferences` to inspect unresolved elective slots against confirmed `student_registrations`.
  - Refactored `manualAllocate`:
    - Updates `student_registrations` with assigned course slot and updates `allocation_metadata` (`allocated_by: 'hod'`) in both `student_registrations` and `registration_preferences`.
- **[`backend/src/modules/registrations/registrations.service.ts`](file:///c:/Users/windows/Fyimpcourseregistration/backend/src/modules/registrations/registrations.service.ts)**:
  - Refactored `getBlueprint` and `getMyRegistration` to read student preferences from `registration_preferences` and confirmed course assignments from `student_registrations`.
  - Refactored `submitCourses`:
    - Persists student submissions into `registration_preferences` in unified array shape with frozen `submitted_at`.
    - Automatically records confirmed fixed slot assignments to `student_registrations` while keeping elective slots `NULL`.
- **[`backend/src/modules/student/student.service.ts`](file:///c:/Users/windows/Fyimpcourseregistration/backend/src/modules/student/student.service.ts)**:
  - Updated `dashboard-summary` to check both `student_registrations` and `registration_preferences`.
  - Displays appropriate statuses for confirmed enrolled, pending preference choices, and unallocated slots requiring HOD resolution.
- **[`backend/src/modules/hod/hod.service.ts`](file:///c:/Users/windows/Fyimpcourseregistration/backend/src/modules/hod/hod.service.ts)**:
  - Updated `createCourse` to return the created course `id` to enable immediate persistence of staged prerequisite rules.

### Frontend
- **[`frontend/src/app/dashboard/hod/BlueprintTab.tsx`](file:///c:/Users/windows/Fyimpcourseregistration/frontend/src/app/dashboard/hod/BlueprintTab.tsx)**:
  - Replaced the prerequisite multi-select checkboxes with the Prerequisite Rule Engine UI.
  - Implemented badge list of active prerequisite rules per course with type tags (`[COURSE]`, `[SEMESTER]`, `[DEPT]`).
  - Added rule deletion via `handleDeleteRule`.
  - Added rule creation controls with contextual dropdowns for courses, semester thresholds, and departments.
  - Added support for staging rules when creating a new course, persisting them right after course creation.
- **[`frontend/src/app/dashboard/student/register/page.tsx`](file:///c:/Users/windows/Fyimpcourseregistration/frontend/src/app/dashboard/student/register/page.tsx)**:
  - Verified hydration with the unified preference and allocation metadata model.

---

## 3. Verification & Build Results
- **Backend**: `npm run build --workspace=backend` (`nest build`) executed successfully with exit code 0.
- **Frontend**: `npm run build --workspace=frontend` (`next build` with Turbopack) executed successfully with exit code 0.
