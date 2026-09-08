# Run Changes: Teacher-Course Assignment & Period Attendance Marking

**Date:** 2026-09-08  
**Scope:** Full-Stack Implementation across Database, NestJS Backend, Next.js 16 App Router Frontend, and Expo Mobile Application  
**User Modifications Applied:** Reduced post-period attendance grace window from 30 minutes to **15 minutes** (`PERIOD_GRACE_MINUTES = 15`).

---

## 1. Database & Migrations
- **Created Migration:** `supabase/migrations/20260908_assignments_and_period_marking.sql`
  - Table `teacher_course_assignments`: `(id, teacher_id, course_id, assigned_by, assigned_at)` with `UNIQUE(teacher_id, course_id)`.
  - Table `period_attendance`: `(id, timetable_slot_id, student_id, course_id, marked_by, status, marked_at, is_late_entry, unlocked_by)` with `UNIQUE(timetable_slot_id, student_id)`.
  - Table `period_unlock_requests`: `(id, timetable_slot_id, unlocked_by, unlocked_at, reason)`.
  - Row Level Security (RLS) policies granting:
    - Faculty access to their assigned course timetable slots and attendance submission.
    - HOD access to department-wide assignments, rosters, and unlock authorizations.
    - Students access to their personal period attendance logs.
    - System administrators full auditing visibility.

---

## 2. Backend (NestJS)
### A. Teacher-Course Assignment Module (`backend/src/modules/assignments/`)
- **DTOs:**
  - `assign-teacher.dto.ts`: Zod schema validating `teacher_id` and `course_id`.
  - `reassign-teacher.dto.ts`: Zod schema validating `new_teacher_id`.
- **Service (`assignments.service.ts`):**
  - `getCoursesAndAssignments`: Fetches all department courses, faculty roster, and active course assignments.
  - `assignTeacher`: Upserts a teacher-course assignment and writes an audit log.
  - `reassignTeacher`: Updates an existing assignment record mid-semester in-place with audit logging.
  - `removeAssignment`: Deletes an assignment with department verification and audit logging.
- **Controller (`assignments.controller.ts`):**
  - `GET /api/assignments/courses` (HOD)
  - `POST /api/assignments/assign` (HOD)
  - `PATCH /api/assignments/:id/reassign` (HOD)
  - `DELETE /api/assignments/:id` (HOD)
- **Module (`assignments.module.ts`):** Exported and registered into `AppModule`.

### B. Period Attendance Marking Module (`backend/src/modules/period-attendance/`)
- **Constants (`period-attendance.constants.ts`):**
  - Configured `PERIOD_GRACE_MINUTES = 15` strictly per user instruction.
- **DTOs:**
  - `submit-attendance.dto.ts`: Validates `timetable_slot_id`, `absent_student_ids`, and optional `client_timestamp`.
  - `unlock-period.dto.ts`: Validates `timetable_slot_id` and `reason`.
- **Service (`period-attendance.service.ts`):**
  - `getCurrentPeriod`: Auto-detects active lecture periods (currently running or ended <= 15 minutes ago) for the authenticated teacher, fetches pre-loaded student rosters from both legacy flat slot columns (`slot_1_course_id` .. `slot_6_course_id`) and JSONB structures on `student_registrations`, and identifies next upcoming class.
  - `submitAttendance`: Implements default-present exception marking (teacher flags absents only). Atomic batch upsert into `period_attendance`. Checks 15-minute grace window and respects HOD unlocks.
  - `unlockPeriod`: Allows HOD to authorize late-entry unlock for slots ended > 15 minutes ago with recorded justification.
  - `getSlotRosterForHod`: Returns full enrolled roster with attendance breakdown.
  - `getDepartmentSlots`: Returns all department timetable slots with attendance status, enrollment, and unlock status.
- **Controller (`period-attendance.controller.ts`):**
  - `GET /api/attendance/period/current` (Faculty/HOD)
  - `POST /api/attendance/period/submit` (Faculty/HOD)
  - `POST /api/attendance/period/unlock` (HOD/Admin)
  - `GET /api/attendance/period/roster` (HOD/Admin)
  - `GET /api/attendance/period/slots` (HOD/Admin)
- **Module (`period-attendance.module.ts`):** Exported and registered into `AppModule`.

---

## 3. Frontend Web (Next.js 16 App Router)
- **Installed Dependency:** `@xyflow/react` for interactive React Flow diagramming.
- **Created `TeacherAssignmentTab.tsx` (`frontend/src/app/dashboard/hod/TeacherAssignmentTab.tsx`):**
  - **Desktop (>= 1024px):** Interactive node-based canvas.
    - Teacher nodes on left with avatar, course load count, and output handle.
    - Course nodes on right with course code badge, credits, semester, and input handle. Unassigned courses highlight with warning dashed amber border and alert badge.
    - Drag connection from Teacher to Course to assign.
    - Inline edit and delete buttons on assigned faculty chips.
    - Interactive pan, zoom, and fit-view controls.
  - **Mobile / Narrow (< 1024px):** Touch-friendly card list with assigned faculty chips and "+ Assign Faculty Member" picker modal.
  - **Mid-Semester Reassignment Modal:** Allows selecting any existing assignment row and replacing the teacher in-place.
- **Created `PeriodMarkingTab.tsx` (`frontend/src/app/dashboard/hod/PeriodMarkingTab.tsx`):**
  - Timetable slot browser with semester and day-of-week filters.
  - Live status pills: Marked (Present/Absent counts), Unmarked/Pending, and Late Unlocked.
  - "Authorize Late Entry" modal with unlock reason field.
  - Enrolled student roster viewer with search filter, attendance rate %, and status indicators (Present, Absent, Late Entry).
- **Updated `HodDashboard` (`frontend/src/app/dashboard/hod/page.tsx`):**
  - Added tabs: `👨‍🏫 Faculty Assignment` and `⏱️ Period Attendance`.
  - Added tab rendering and session storage persistence.

---

## 4. Mobile App (Expo React Native)
- **Updated `API_ENDPOINTS` (`mobile/src/api/endpoints.ts`):**
  - Added `PERIOD_ATTENDANCE_CURRENT`, `PERIOD_ATTENDANCE_SUBMIT`, `PERIOD_ATTENDANCE_ROSTER`, `PERIOD_ATTENDANCE_UNLOCK`.
- **Updated `queryKeys` (`mobile/src/lib/query-client.ts`):**
  - Added `currentPeriod` query key scoped to teacher ID.
- **Upgraded Period Marking Screen (`mobile/app/(teacher)/mark.tsx`):**
  - Auto-loads current running lecture or lecture ended within 15-minute grace window using `GET /api/attendance/period/current`.
  - Back-to-back lecture switcher pill row when multiple classes run concurrently or in sequence.
  - Default-present exception marking: All enrolled students are present by default; tapping student toggles absent (red card with "ABSENT" badge).
  - Quick action to "Reset All to Present".
  - Real-time attendance counts: Enrolled, Present, Absent.
  - Student search bar for large lecture halls.
  - Submit button with offline queue support:
    - Online: Calls `POST /api/attendance/period/submit`.
    - Offline: Queues action via `useOfflineQueue` and auto-syncs on reconnect.
  - Grace window prompt: Informs faculty if period has ended > 15 minutes ago and prompts them to request HOD unlock.
  - Empty state when no lecture is active: Displays friendly notice and details of the next scheduled lecture with start time.

---

## 5. Verification
- **Backend Build:** `npm run build --workspace=backend` compiled with **0 errors**.
- **Frontend Build:** `npm run build --workspace=frontend` compiled with Turbopack and TypeScript with **0 errors**.
