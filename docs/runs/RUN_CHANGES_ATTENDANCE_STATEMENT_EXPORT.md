# Run Summary: Attendance Statement Export (XLSX)

**Date**: 2026-09-08
**Feature**: Attendance Statement Export (APC - Attendance Progress Certificate format)
**Stack**: NestJS Backend, Next.js 16 App Router Frontend, ExcelJS

---

## 1. Overview
Implemented the official **Attendance Statement Export** feature allowing Head of Departments (HODs) to download a formatted, styled Microsoft Excel (`.xlsx`) sheet containing the per-student, per-course attendance percentage matrix for any selected semester.

The design faithfully mirrors the traditional paper-based APC statement used by university departments, with automated formula calculation, conditional styling, and student-level summary averages.

---

## 2. Key Computation & Business Rules Implemented
- **Department Scoping**: The request validates that the logged-in user is an HOD associated with a specific department; cross-department statement exports are rejected with `403 Forbidden`.
- **Course Attendance Calculation**:
  $$\text{Attendance } \% = \left(\frac{\text{Periods Present}}{\text{Total Periods Conducted}}\right) \times 100$$
  - Rounded to 2 decimal places.
  - **Total Periods Conducted**: Distinct `timetable_slot_id` count from `period_attendance` where at least one attendance record was marked for that course in the department and semester.
  - **Periods Present**: Count of marked attendance records where `status = 'present'` for that student and course.
- **NA Logic**: If a student is not enrolled in a course (checked via `student_registrations`), the course cell displays `NA` with muted gray italic styling and is strictly excluded from the student's **Average APC** calculation.
- **Average APC per Student**: The arithmetic mean of all non-NA course attendance percentages for the student in that semester.
- **Regulatory Warning Threshold (< 60%)**: Any cell with an attendance percentage below 60.00% (both individual course percentages and the student's Average APC) is highlighted in soft red (`#FFC7CE`) with bold dark-red text (`#9C0006`) per university APC condonation guidelines.

---

## 3. Files Created & Modified

### Backend (`backend/`)
1. **[backend/package.json](file:///c:/Users/windows/Fyimpcourseregistration/backend/package.json)**
   - Installed `exceljs` (`^4.4.0`) for high-performance server-side workbook generation and styling.
2. **[backend/src/modules/period-attendance/attendance-export.service.ts](file:///c:/Users/windows/Fyimpcourseregistration/backend/src/modules/period-attendance/attendance-export.service.ts)** (NEW)
   - Fetches HOD department details, semester metadata, courses, and enrolled students.
   - Computes distinct conducted slots and present tallies per student-course.
   - Generates the ExcelJS workbook:
     - Header banner: Department Name, Semester, Generated Date & Time.
     - Column Headers: Sl No, Register Number, Student Name, Course Columns (`Course Code\nCourse Name`), Total Conducted row, and Average APC column.
     - Student data rows with zebra borders, center alignment, and conditional red fill for `<60%`.
     - Auto-fitted column widths for clean readability and printing.
3. **[backend/src/modules/period-attendance/attendance-export.controller.ts](file:///c:/Users/windows/Fyimpcourseregistration/backend/src/modules/period-attendance/attendance-export.controller.ts)** (NEW)
   - Route: `GET /api/attendance/export/statement?semesterId=<uuid>`
   - Enforces `JwtAuthGuard` and `RolesGuard` (`hod`).
   - Streams the `.xlsx` binary directly with `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` and dynamic `Content-Disposition` attachment header.
4. **[backend/src/modules/period-attendance/period-attendance.controller.ts](file:///c:/Users/windows/Fyimpcourseregistration/backend/src/modules/period-attendance/period-attendance.controller.ts)** (MODIFIED)
   - Added alias route: `GET /api/attendance/period/export/statement?semesterId=<uuid>` ensuring route compatibility across frontend calling patterns.
5. **[backend/src/modules/period-attendance/period-attendance.module.ts](file:///c:/Users/windows/Fyimpcourseregistration/backend/src/modules/period-attendance/period-attendance.module.ts)** (MODIFIED)
   - Registered `AttendanceExportService` as a provider and `AttendanceExportController` as a controller.

### Frontend (`frontend/`)
1. **[frontend/src/app/dashboard/hod/PeriodMarkingTab.tsx](file:///c:/Users/windows/Fyimpcourseregistration/frontend/src/app/dashboard/hod/PeriodMarkingTab.tsx)** (MODIFIED)
   - Added state `exporting` and handler `handleExportStatement()`.
   - Injected primary export button: **"Export Sem X Statement (XLSX)"** with `FileSpreadsheet` icon and loading spinner.
   - Downloads file directly as `attendance_statement_<semesterId>.xlsx` via browser blob URL.

---

## 4. Verification & Validation
- **Backend Compilation**: `npm run build --workspace=backend` succeeded with 0 errors.
- **Frontend Compilation**: `npm run build --workspace=frontend` succeeded with 0 errors.
- **Format Integrity**: Binary Excel sheet streamed directly from NestJS Express response stream.
