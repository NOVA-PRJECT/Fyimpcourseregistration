# Run Changes: Course Allocation System Redesign

**Date**: 2026-09-08  
**Scope**: Redesign course registration from wishlist model to scored 3-round allocation model with fixed slot preservation, capacity enforcement, prerequisite soft scoring, proximity points, tiebreakers, Campus Director controls, and HOD reactive manual allocation.

---

## 1. Summary of Changes

### Database Migration (`supabase/migrations/20260908_course_allocation_system.sql`)
- **`courses` table alterations**:
  - `seat_limit` (INTEGER DEFAULT 60) — Total course capacity across both fixed and elective students.
  - `prerequisite_course_ids` (UUID[] DEFAULT '{}') — Course IDs granting soft scoring bonus when completed prior.
  - `allowed_department_ids` (UUID[] DEFAULT '{}') — Department restrictions (empty means open to all departments).
- **`student_registrations` table alterations**:
  - `preferences` (JSONB DEFAULT '[]'::jsonb) — Ordered preference choices (max 3) per slot.
  - `allocation_metadata` (JSONB DEFAULT '{}'::jsonb) — Stores `round`, `score`, `proximity_points`, `prerequisite_points`, `allocated_by`, `allocated_at`.
- **`allocation_runs` table**:
  - Tracks execution lifecycle: `id`, `semester_id`, `status` ('pending' | 'running' | 'completed' | 'failed'), `round`, `stats`, `error`, `started_at`, `completed_at`, `triggered_by`.
- **PostgreSQL RPC Function `apply_course_allocation`**:
  - Implements atomic transaction committing allocations and updating run status. Rolls back completely on error to prevent partial states.

---

## 2. Backend Implementation (NestJS)

### Allocation Module (`backend/src/modules/allocation/`)
- **`allocation.service.ts`**:
  - **3-Round Algorithm**:
    - Round 1 allocates 1st preference; Round 2 handles unresolved slots with 2nd preference; Round 3 handles remaining with 3rd preference.
  - **Seat Limit & Fixed Deduction**:
    - Deducts confirmed fixed slots from `seat_limit` ($N = \max(0, \text{seat\_limit} - \text{fixed confirmed})$) before running elective allocation.
  - **Scored Ranking**:
    - Prerequisite score ($+1$ for each completed prerequisite course from earlier semesters).
    - Proximity score: $\max(0, \text{student.current\_semester} - \text{course.semester})$.
    - Tiebreaker: `submitted_at` ascending.
  - **Re-run Support**:
    - Resets elective slots while preserving fixed slots (`allocated_by = 'fixed'`).
  - **HOD Endpoints**:
    - `GET /api/allocation/unresolved`: Fetches unassigned students in HOD's department with their preference choices.
    - `GET /api/allocation/remaining-seats`: Fetches live remaining seats for department courses.
    - `POST /api/allocation/manual-allocate`: Reactive assignment with `allocated_by: "hod_manual"`.
- **`allocation.controller.ts`**: Exposes Director run/status endpoints and HOD manual allocation endpoints with role guards.
- **`allocation.module.ts`**: Registered in `backend/src/app.module.ts`.

### Registrations Service Updates (`backend/src/modules/registrations/`)
- **Department Filtering**: `getAvailableCourses` excludes courses where `allowed_department_ids` is non-empty and does not include the student's department.
- **Submission Logic**:
  - Freezes `submitted_at` on first submission so re-submissions do not penalize tiebreaker priority.
  - Validates up to 3 distinct preferences per elective slot.
  - Auto-allocates fixed courses (`allocated_by: "fixed"`); marks elective slots unassigned pending allocation run.
  - Exposes `GET /api/registrations/my` for student dashboard status.

### HOD Course Management (`backend/src/modules/hod/hod.service.ts`)
- Updated `createCourse` and `updateCourse` to accept and persist `seat_limit`, `prerequisite_course_ids`, and `allowed_department_ids`.

### Audit Logging (`backend/src/core/logging/audit-logger.service.ts`)
- Added `ALLOCATION_RUN_COMPLETED` and `MANUAL_ALLOCATION` event definitions and logging methods.

---

## 3. Frontend Implementation (Next.js 16 App Router)

### Student Registration Interface (`frontend/src/app/dashboard/student/register/page.tsx`)
- **Fixed Slots**: Clearly tagged with a blue lock badge (`🔒 Fixed Paper — Assigned Automatically`).
- **Elective Slots**: Up to 3 ranked dropdown selectors (`1st Choice (Highest)`, `2nd Choice`, `3rd Choice`).
- **Post-Allocation Status**:
  - Allocated slots show confirmed course details in a green card.
  - Unresolved slots display neutral `"Not yet allocated — contact your HOD"` (no round numbers or scores exposed).

### Director Control Panel (`frontend/src/app/dashboard/director/page.tsx`)
- Added **Course Allocation** tab.
- Displays current allocation run status badge (Idle / Running / Completed / Failed).
- 2-second polling during active runs.
- **Re-run Modal**: Explicit confirmation dialog alerting the director that elective allocations (including manual assignments) will be reset while fixed slots are preserved.

### HOD Management Interfaces
- **`BlueprintTab.tsx`**:
  - Modal inputs for `seat_limit`, `allowed_department_ids` (multi-select), and `prerequisite_course_ids` (multi-select).
  - Course table displays capacity and prerequisite constraints.
- **`ManualAllocationTab.tsx`**:
  - Two-column layout:
    - **Unresolved Students**: Lists students missing course placements along with their submitted preferences.
    - **Remaining Seats**: Visual capacity meters showing total limit, occupied seats, and remaining seats.
    - **Assign Modal**: Allows HOD to manually assign remaining available courses with real-time capacity validation.
- **`page.tsx`**: Added "Manual Allocation" navigation tab.

---

## 4. Verification Results

| Suite | Command | Result |
|---|---|---|
| **Backend Build** | `npm run build --workspace=backend` | Succeeded (0 TypeScript/NestJS errors) |
| **Frontend Build** | `npm run build --workspace=frontend` | Succeeded (0 Turbopack/Next.js errors) |

---

## 5. Artifacts & Documentation
- [implementation_plan.md](file:///C:/Users/windows/.gemini/antigravity-ide/brain/59343b79-c52d-4471-8674-2d9034f2870c/implementation_plan.md) — Architectural specification approved by user.
- [walkthrough.md](file:///C:/Users/windows/.gemini/antigravity-ide/brain/59343b79-c52d-4471-8674-2d9034f2870c/walkthrough.md) — Verification walkthrough.
