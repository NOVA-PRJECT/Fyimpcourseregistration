# Changes — Faculty Assignment Remove Fix (Run 2026-09-11)

## Summary
Fixed the issue where the "Remove" button next to assigned faculty on a course in the HOD dashboard was failing or not responding.

---

## 1. Backend Changes

### `backend/src/modules/assignments/assignments.service.ts`
- **`removeAssignment`**:
  - Replaced fragile nested PostgREST join `.select('id, course_id, teacher_id, courses(department_id)')` with a direct two-step query:
    1. Fetch `teacher_course_assignments` record by `assignmentId`.
    2. Fetch `courses` record by `course_id` to retrieve `department_id` and `course_code`.
  - Fixed false-positive `ForbiddenException` caused when PostgREST returns relations as arrays or when called by superadmin.
  - Enhanced audit logging to include course code.
- **`reassignTeacher`**:
  - Applied the same direct two-step course query to avoid the same nested relation issues during reassignment.

---

## 2. Frontend Changes

### `frontend/src/app/dashboard/hod/TeacherAssignmentTab.tsx`
- **Modal Confirmation**:
  - Replaced native browser `window.confirm()` with a dedicated confirmation modal:
    - Course code and title: `{course_code} ({course_title})`
    - Teacher name: `{teacher_name}`
    - Clear warning: "The course will become unassigned until another faculty member is assigned."
    - "Cancel" and "Yes, Remove" buttons.
- **Loading State**:
  - Added `removing` state displaying "Removing..." and disabling actions during the API call.
- **In-Modal Error Feedback**:
  - Added `removeModalError` so any API failure is immediately shown directly inside the modal rather than off-screen.
- **Canvas View Support**:
  - Updated `CourseNode` in the ReactFlow diagram to support the new confirmation modal flow.
- **Responsive Feedback**:
  - Displays a clean green success banner upon removal and auto-refreshes course and assignment statistics.
