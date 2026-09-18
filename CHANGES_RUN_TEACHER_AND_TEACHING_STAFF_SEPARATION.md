# Run Summary: Separation of Teacher and Teaching Staff Dashboards

**Date**: 2026-09-17  
**Status**: Completed  
**Branch / Workspace**: FYIMP Course Registration

---

## 1. What Was Requested
The user specified that the `teacher` and `teaching_staff` roles have fundamentally different responsibilities and require completely distinct feature sets:
1. **Separation of Roles**:
   - `teaching_staff`: General departmental faculty member who inspects departmental course listings, views enrolled students across departments, and reviews curriculum (read-only; per user instruction: **no attendance roster generation**). Dedicated route: `/dashboard/teaching_staff`.
   - `teacher`: Course Instructor who has specifically assigned courses (`teacher_course_assignments`). Needs to view today's lecture timetable (Periods 1 to 6), mark and submit real-time period lecture attendance (Present/Absent toggles), view assigned course class rosters, and generate **official PDF attendance roster sheets** (transferred from teaching_staff to teacher per user feedback). Dedicated route: `/dashboard/teacher`.

---

## 2. What Was Changed

### Backend Modifications
1. **Authentication Role Routing (`backend/src/modules/auth/auth.service.ts`)**:
   - Updated `ROLE_DASHBOARD_MAP` to map:
     - `teaching_staff: '/dashboard/teaching_staff'`
     - `teacher: '/dashboard/teacher'`
2. **Teacher Schedule & Timetable Endpoint (`backend/src/modules/period-attendance/period-attendance.service.ts`)**:
   - Implemented `getTeacherSchedule(user, queryDate)`:
     - Resolves the logged-in teacher's profile and assigned courses from `teacher_course_assignments`.
     - Queries timetable entries for the requested day of week.
     - Retrieves live attendance marking status for each slot (`is_marked`, `present_count`, `absent_count`, and enrolled students).
   - Relaxed clock grace limit in development mode (`NODE_ENV === 'development'`) to allow testing attendance marking anytime during local development.
3. **Period Attendance Controller (`backend/src/modules/period-attendance/period-attendance.controller.ts`)**:
   - Added endpoint `GET /api/attendance/period/teacher-schedule` secured by `@Roles('teacher', 'teaching_staff', 'hod')`.

### Frontend Modifications
1. **Route Security Configuration (`frontend/src/core/security/routeConfig.ts`)**:
   - Updated `ROLE_DASHBOARD_MAP` and `DASHBOARD_ROLE_MAP` to distinguish:
     - `teaching_staff: '/dashboard/teaching_staff'`
     - `teacher: '/dashboard/teacher'`
2. **Next.js Middleware (`frontend/middleware.ts`)**:
   - Refined dashboard route prefix matching with length-descending sorting and boundary checking to prevent partial collisions between routes.
3. **Teaching Staff Dashboard (`frontend/src/app/dashboard/teaching_staff/`)**:
   - **`layout.tsx`**: Route guard strictly checking `role === 'teaching_staff'`.
   - **`page.tsx`**: Departmental Course Browser:
     - 1. Semester filter & 2. Department filter.
     - 3. Paper / Course selection dropdown.
     - Course details, enrolled students counter, and department breakdown.
     - Class roster table with department filter dropdown.
     - **Removed PDF generation button and modal** per user feedback.
   - **`teaching-staff.module.css`**: Tailored stylesheet with institutional theme.
4. **Teacher Dashboard (`frontend/src/app/dashboard/teacher/`)**:
   - **`layout.tsx`**: Route guard strictly checking `role === 'teacher'`.
   - **`page.tsx`**: Two-tab institutional dashboard:
     - **Tab 1: Today's Schedule & Attendance**:
       - Date selector with "Today" shortcut and refresh trigger.
       - Periods 1 to 6 cards showing period timing, assigned course title and code, semester badge, and attendance status ("✓ Attendance Marked" with Present/Absent counts vs "⏳ Attendance Pending").
       - Interactive **Mark Attendance** modal with student list, individual Present (green) / Absent (red) toggles, "All Present" / "All Absent" quick actions, live counters, and submission to `POST /api/attendance/period/submit`.
     - **Tab 2: My Assigned Papers & Class Rosters**:
       - Displays assigned courses from `teacher_course_assignments`.
       - Class roster table with department filtering.
       - **📄 Download Attendance Sheet (PDF)** button and department selection modal with `generateAttendanceSheet`.
   - **`teacher-dashboard.module.css`**: Styles for tabs, period cards, attendance status badges, and interactive marking modal.

---

## 3. Why These Changes Were Made
- Prior to this run, both roles were funnelled to `/dashboard/teacher`, where `teacher` lacked timetable period attendance marking features and `teaching_staff` had access to PDF roster exports intended for individual course instructors.
- The separation provides clean role authorization boundaries, prevents route collisions, and ensures each user sees only their respective tools and workflows.

---

## 4. Verification & Follow-Up
- Both `/dashboard/teaching_staff` and `/dashboard/teacher` layouts have strict role validation.
- Route middleware correctly dispatches sessions according to authoritative role.
- Manual testing steps provided for both roles.
