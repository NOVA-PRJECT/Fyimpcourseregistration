# Run Changes

Date: 2026-09-09

### 1. Director Settings & Registration Window Controls
- **Files**:
  - `backend/src/modules/director/director.service.ts`
  - `backend/src/modules/director/director.controller.ts`
  - `frontend/src/app/dashboard/director/page.tsx`
- **Changes**:
  - `director.service.ts`: Updated `getSettings` to select all governance columns from `campus_settings` (`deadline, min_credits, max_credits, academic_year, last_promoted_at`). Enhanced `updateSettings` to accept and update `min_credits`, `max_credits`, and `academic_year` alongside `deadline`.
  - `director/page.tsx`: Added quick presets (`+7 Days`, `+14 Days`, `+30 Days`) to easily set registration deadlines. Updated the status indicator to prominently display `🟢 Registration Window OPEN` vs `⛔ Registration Window CLOSED`. Dynamic action button labels: `Open Registration Window →` / `Update Registration Deadline →`.
- **Reason**: Aligns the Campus Director experience with opening and configuring the registration window before students begin registering.

### 2. HOD Single Student Add & Bulk CSV Upload Database Alignment
- **Files**:
  - `backend/src/modules/hod/hod.controller.ts`
  - `backend/src/modules/hod/hod.service.ts`
- **Changes**:
  - `hod.controller.ts`: Updated `AddStudentSchema` to require `cap_application_number`.
  - `hod.service.ts`:
    - `addStudent`: Included `cap_application_number` in the `students` table insert. Omitted `email` from the `students` insert payload (emails reside in `auth.users`, and `students` has no `email` column).
    - `bulkCreateStudents`: Extracted `cap_application_number` from CSV row (`row.cap_application_number || row['CAP Number'] || fallback unique CAP`) and omitted `email` from the `students` insert payload.
- **Reason**: Single student creation and bulk CSV uploads previously failed on database insertion due to missing the `NOT NULL UNIQUE` constraint on `cap_application_number` and attempting to insert into a non-existent `email` column on `students`.

### 3. Student Course Details & 3-Rank Elective Selection
- **Files**:
  - `frontend/src/app/dashboard/student/StudentDashboardClient.tsx`
  - `frontend/src/app/dashboard/student/register/page.tsx`
- **Changes**:
  - `StudentDashboardClient.tsx`: Updated action links to explicitly display `View Course Details & Register Electives →` / `View Course Details & Update Preferences →`.
  - `register/page.tsx`:
    - Displayed course codes alongside titles and department names in `CustomSelect` options and triggers.
    - Updated `handlePreferenceChange` to automatically clear duplicate selections across ranks within a slot (e.g. choosing a paper for 1st choice clears it from 2nd/3rd choice).
- **Reason**: Provides clarity for students viewing both fixed and elective courses and entering up to three ranked preferences for electives.

### 4. Resilient Allocation Run Query & Window Closure Verification
- **Files**:
  - `backend/src/modules/allocation/allocation.service.ts`
  - `frontend/src/app/dashboard/director/page.tsx`
- **Changes**:
  - `allocation.service.ts`: Decoupled `registration_preferences` and `students` query. Step E now fetches `registration_preferences` directly and looks up matching `students` via `.in('id', studentIds)`.
  - `director/page.tsx`: Added a window-open guard. When the Director clicks "Run Course Allocation" while the registration window is still open, a warning modal informs the Director that preferences should be frozen. Provides a one-click action: `Close Window & Run Allocation →`.
- **Reason**: Prevents PostgREST inner join schema cache errors when joining `registration_preferences` to `students` (as `registration_preferences` references `auth.users(id)`), and ensures registration is closed before allocation runs.

### 5. Unified Master Migration & GoTrue-Safe Test User Seeding
- **Files**:
  - `supabase/migrations/FULL_CLEAN_SETUP_AND_TEST_SEED.sql`
  - `backend/src/scripts/seed-test-users.ts`
  - `backend/scripts/test_students_bulk.csv`
  - `backend/package.json`
- **Changes**:
  - `FULL_CLEAN_SETUP_AND_TEST_SEED.sql`: Built a single, self-contained, idempotent master migration SQL script setting up 100% of the public schema (tables, constraints, RLS, compatibility views, `INSTEAD OF` triggers, RPCs like `apply_course_allocation` and `promote_campus_students`) and pre-populating institutional reference data (4 campuses: `MANGAT`, `THALAS`, `NILESH`, `PAYYAN`; 13 departments; 4 campus settings; 60 real academic courses; blueprints; 30 time slots).
  - `seed-test-users.ts`: Built a GoTrue-compliant seed script using `@supabase/supabase-js` Admin Auth API (`supabase.auth.admin.createUser`) to safely create all test users (SuperAdmin, 2 Campus Directors, 7 HODs, 2 Teachers, and 70 synthetic students across 7 departments for Sem 1 and Sem 3) with confirmed emails, password `Password123!`, and `must_change_password = false`.
  - `test_students_bulk.csv`: Provided a prepared, valid CSV template ready for testing the HOD Bulk Student Upload feature.
  - `package.json`: Added `"seed:users": "ts-node src/scripts/seed-test-users.ts"`.
- **Reason**: Allows testing all portal features on a clean Supabase project without raw SQL auth bypass crashes.

### 6. Full End-to-End Automated Test Script & Database Alignments
- **Files**:
  - `backend/src/scripts/test-e2e-flow.ts`
  - `backend/src/scripts/fix-blueprints.ts`
  - `supabase/migrations/20260909_patch_e2e_views_and_columns.sql`
  - `supabase/migrations/FULL_CLEAN_SETUP_AND_TEST_SEED.sql`
  - `backend/package.json`
- **Changes**:
  - `test-e2e-flow.ts`: Built a comprehensive 8-step test harness verifying Director Settings, Student 3-rank elective registration with competing choices, registration window closure enforcement, 3-round allocation solver execution, student confirmed registration view, HOD roster query, Excel binary export download, and timetable solver generation & publishing.
  - `fix-blueprints.ts`: Populated complete `pathways` with slot arrays, slot rules (`FIXED`, `GLOBAL_BASKET`), and targets (`KU01DSCCSE101`, `MDC-1`, `AEC-1`) for Semester 1 and Semester 3.
  - `20260909_patch_e2e_views_and_columns.sql`: Non-destructive patch adding `published_at` to `timetable_entries`, `triggered_by` to `allocation_runs` and `timetable_generation_jobs` views/triggers, and foreign key relationships to `students` table for seamless PostgREST joins.
  - `package.json`: Added `"test:e2e": "ts-node src/scripts/test-e2e-flow.ts"`.
- **Reason**: Guarantees end-to-end reliability and eliminates runtime PostgREST schema cache errors across all portals.

### 7. Resolution of View 42P16 Error, Pathway Column Type Fix & 100% E2E Verification
- **Files**:
  - `supabase/migrations/20260909_patch_e2e_views_and_columns.sql`
  - `supabase/migrations/FULL_CLEAN_SETUP_AND_TEST_SEED.sql`
  - `backend/src/modules/allocation/allocation.service.ts`
  - `backend/src/modules/registrations/registrations.service.ts`
  - `backend/src/scripts/test-e2e-flow.ts`
  - `RUN_CHANGES.md`
- **Changes**:
  - `20260909_patch_e2e_views_and_columns.sql` & `FULL_CLEAN_SETUP_AND_TEST_SEED.sql`:
    - Resolved PostgreSQL error `42P16` (cannot change name of view column) by explicitly executing `DROP VIEW IF EXISTS <view_name> CASCADE;` prior to view recreation.
    - Altered `registration_preferences.pathway_id` from `UUID` to `TEXT`, aligning with `student_registrations.pathway_id` and blueprint text IDs (`pw-cs-std`).
  - `allocation.service.ts`:
    - Fixed critical bug where `allocation_runs` status update to `'completed'` was trapped inside `if (rpcErr)` direct fallback, causing successful RPC runs to remain `'running'` and blocking subsequent runs with 409 Conflict. Moved status update to execute unconditionally upon completion.
  - `registrations.service.ts`:
    - Fixed PostgREST column error by selecting `selections` instead of non-existent `preferences` column from `student_registrations`.
  - `test-e2e-flow.ts`:
    - Added automatic clearance of stale `'running'` allocation runs prior to solver testing.
    - Updated HOD Excel export test to call `/api/hod/export-students-excel?semester=1` and assert registered student count.
  - **Results**:
    - Ran `npm run test:e2e` in `backend/`: **29/29 tests passed (100% pass rate)**.
    - Verified full end-to-end flow across Campus Director governance, Student 3-rank elective registration, window closure enforcement, 3-round allocation solver, student confirmed dashboard, HOD roster & paper assignments export, and Timetable AI solver generation, publishing, and cross-role visibility.

### 8. HOD Bulk Upload CSV Header Alignment
- **Files**:
  - `backend/scripts/test_students_bulk.csv`
  - `RUN_CHANGES.md`
- **Changes**:
  - `test_students_bulk.csv`: Updated columns to exact required headers validated by `frontend/src/app/dashboard/hod/page.tsx`:
    `full_name,cap_application_number,academic_year_joined,current_semester,email`
  - Populated 5 realistic synthetic student records for test upload into the IT Department roster.
- **Reason**: Enables seamless physical file upload testing in the HOD portal without header validation rejection.

### 9. Student Dashboard GPS Geofence Campus Sign-In Component
- **Files**:
  - `backend/src/modules/student/student.service.ts`
  - `frontend/src/app/dashboard/student/CampusSignInCard.tsx`
  - `frontend/src/app/dashboard/student/StudentDashboardClient.tsx`
  - `frontend/src/app/dashboard/student/page.tsx`
  - `RUN_CHANGES.md`
- **Changes**:
  - `student.service.ts`: Updated `getDashboardSummary` to include `id: user.userId` in the `studentInfo` payload so the client can query attendance status.
  - `CampusSignInCard.tsx`: Built a modern, dedicated Campus GPS Sign-In widget:
    - Queries `GET /api/attendance/campus/status/:studentId` for today's session status.
    - Displays Morning (AM) and Evening (PM) status badges (`✓ Present` vs `Pending`).
    - Provides interactive button: `📍 Verify Campus Presence (GPS Sign-In)`.
    - Coordinates with browser `navigator.geolocation.getCurrentPosition({ enableHighAccuracy: true })`.
    - Submits `{ latitude, longitude, accuracy }` to `POST /api/attendance/campus/sign-in`.
    - Provides real-time distance and verification feedback with automatic status refresh.
  - `StudentDashboardClient.tsx`: Embedded `CampusSignInCard` prominently on the student dashboard between the profile section and the enrolled courses section.
  - `page.tsx`: Updated `StudentInfo` interface to support optional `id`.
  - **Verification**: `nest build` (backend) and `npx tsc --noEmit` (frontend) compiled cleanly with 0 errors.

### 10. Teacher Course Assignments Schema Alignment (HOD Portal)
- **Files**:
  - `supabase/migrations/FULL_CLEAN_SETUP_AND_TEST_SEED.sql`
  - `supabase/migrations/20260909_patch_e2e_views_and_columns.sql`
  - `RUN_CHANGES.md`
- **Changes**:
  - `teacher_course_assignments` table:
    - Added `assigned_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL`.
    - Added `assigned_by UUID REFERENCES faculty(id) ON DELETE SET NULL`.
    - Dropped `NOT NULL` on `academic_year` and `semester`.
    - Added `CONSTRAINT teacher_course_assignments_unique UNIQUE(teacher_id, course_id)`.
- **Reason**: Fixes runtime PostgreSQL error `column teacher_course_assignments.assigned_at does not exist` when HOD opens the Faculty Assignment tab, and allows assigning faculty to courses with conflict resolution on `(teacher_id, course_id)`.

### 11. Campus Sign-Ins Zero Coordinate Retention Schema Alignment (HOD Attendance & Student GPS)
- **Files**:
  - `supabase/migrations/FULL_CLEAN_SETUP_AND_TEST_SEED.sql`
  - `supabase/migrations/20260909_patch_e2e_views_and_columns.sql`
  - `RUN_CHANGES.md`
- **Changes**:
  - Recreated `campus_sign_ins` table with the production Zero Coordinate Retention schema:
    - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
    - `student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE`
    - `campus_id UUID NOT NULL REFERENCES campuses(id) ON DELETE CASCADE`
    - `session_type TEXT NOT NULL CHECK (session_type IN ('morning', 'evening'))`
    - `signed_in_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL`
    - `signed_in_date DATE NOT NULL DEFAULT ((timezone('utc'::text, now()) AT TIME ZONE 'Asia/Kolkata')::date)`
    - `location_accuracy_meters NUMERIC NOT NULL DEFAULT 10`
    - `status TEXT NOT NULL CHECK (status IN ('on_time', 'late', 'early_leave'))`
    - `source TEXT NOT NULL DEFAULT 'gps' CHECK (source IN ('gps', 'manual_staff'))`
    - `CONSTRAINT campus_sign_ins_unique UNIQUE (student_id, campus_id, signed_in_date, session_type)`
  - Configured RLS policies for students, faculty, and administrators.
- **Reason**: Resolves runtime PostgreSQL error `column campus_sign_ins.session_type does not exist` when HOD views the Campus Attendance tab, and enables twice-daily student GPS physical attendance verification.

### 12. UI Polish, Friendly Error Messaging, Instant Navigation & SuperAdmin Logs
- **Files**:
  - `frontend/src/app/dashboard/hod/CampusAttendanceTab.tsx`
  - `frontend/src/app/login/page.tsx`
  - `backend/src/modules/admin/admin.service.ts`
  - `backend/src/modules/admin/admin.controller.ts`
  - `frontend/src/app/dashboard/superadmin/page.tsx`
  - `frontend/src/app/dashboard/superadmin/superadmin-dashboard.module.css`
  - `frontend/src/app/dashboard/superadmin/logs/page.tsx`
  - `frontend/src/app/dashboard/student/page.tsx`
  - `frontend/src/app/dashboard/student/student-dashboard.module.css`
  - `frontend/src/app/dashboard/student/register/page.tsx`
  - `RUN_CHANGES.md`
- **Changes**:
  1. **HOD Campus Attendance Roster Clean-up**:
     - Removed the misplaced "📊 Ledger" table column and links (`/dashboard/credit-ledger/[studentId]`) from `CampusAttendanceTab.tsx`.
     - Physical campus attendance now strictly focuses on Morning and Evening arrival/departure checkpoints without leaking student UUIDs.
  2. **Login Error Messaging**:
     - Corrected error extraction logic in `login/page.tsx` so `data.message` takes precedence over generic `data.error` ("Bad Request" / "Unauthorized").
     - Wrong credentials now explicitly render: `"Invalid email or password. Please try again."`
  3. **SuperAdmin System Logs Backend & Tab**:
     - Implemented `getSystemLogs({ page, limit, logType, status, search })` in `admin.service.ts` querying `system_logs`.
     - Exposed protected `@Get('logs')` endpoint in `admin.controller.ts`.
     - Added a 4th tab `📜 System & Audit Logs` in `superadmin/page.tsx` with live filters (search query, log type, status), formatted timestamp, badges, and an interactive metadata modal.
     - Added `/dashboard/superadmin/logs/page.tsx` redirect route so accessing `/dashboard/superadmin/logs` directly never returns a 404.
  4. **Student Dashboard Instant Navigation & Skeleton States**:
     - Replaced the unstyled full-page white loading screen (`Loading dashboard...`) in `student/page.tsx` with:
       - **Session Caching (SWR pattern)**: Hydrates dashboard state instantly from `sessionStorage` on mount, eliminating loading lag when navigating back-and-forth between pages.
       - **Modern Skeleton Loader**: Renders a themed dark-navy skeleton with pulsating avatars, chips, action cards, and tables when data is being retrieved for the first time.
      - Updated student registration Back button to use Next.js `<Link>` with route prefetching.

### 13. SuperAdmin Dashboard JSX Syntax Error Fix
- **Files**:
  - `frontend/src/app/dashboard/superadmin/page.tsx`
  - `RUN_CHANGES.md`
- **Changes**:
  - Inserted missing closing token `)}` after the `deleteFaculty` modal dialog block at line 1215.
- **Reason**: Fixes Next.js Turbopack compiler error: `Expected '</', got '{'` at line 1216.

### 14. Individual Teacher Role, HOD Teacher Creation, Course Assignment Guard, & Personalized Teacher Dashboard
- **Files**:
  - `supabase/migrations/20260909_add_teacher_role_constraint.sql`
  - `supabase/migrations/FULL_CLEAN_SETUP_AND_TEST_SEED.sql`
  - `backend/src/core/auth/types.ts`
  - `backend/src/core/constants/roles.ts`
  - `backend/src/modules/auth/auth.service.ts`
  - `frontend/src/core/constants/roles.ts`
  - `frontend/src/core/security/routeConfig.ts`
  - `frontend/src/app/dashboard/teacher/layout.tsx`
  - `backend/src/modules/faculty/faculty.controller.ts`
  - `backend/src/modules/period-attendance/period-attendance.controller.ts`
  - `backend/src/modules/campus-attendance/campus-attendance.controller.ts`
  - `backend/src/modules/credit-ledger/credit-ledger.controller.ts`
  - `backend/src/modules/timetable/timetable.controller.ts`
  - `backend/src/modules/hod/hod.controller.ts`
  - `backend/src/modules/hod/hod.service.ts`
  - `backend/src/modules/assignments/assignments.service.ts`
  - `frontend/src/app/dashboard/hod/TeacherAssignmentTab.tsx`
  - `backend/src/modules/faculty/faculty.service.ts`
  - `frontend/src/app/dashboard/teacher/page.tsx`
  - `RUN_CHANGES.md`
- **Changes**:
  1. **6th Distinct System Role (`teacher`)**:
     - Introduced `teacher` as a dedicated role for individual course teachers, alongside `teaching_staff` (general faculty), `hod`, `campus_director`, `superadmin`, and `student`.
     - Created database migration `20260909_add_teacher_role_constraint.sql` updating `faculty_role_check` to `CHECK (role IN ('hod', 'campus_director', 'teaching_staff', 'teacher'))`.
     - Updated `Role` types, constants, route security configs, and dashboard maps (`teacher -> /dashboard/teacher`).
     - Added `'teacher'` to authorized role guards across faculty, period attendance, campus attendance, credit ledger, and timetable controllers.
  2. **HOD Teacher Creation & Department Management**:
     - Implemented `POST /api/hod/teachers` and `DELETE /api/hod/teachers/:id` in `hod.controller.ts` & `hod.service.ts`.
     - HOD can provision new course teachers with Supabase auth accounts and faculty records scoped to their department (`role: 'teacher'`).
     - HOD can delete/remove department teachers (clearing any active assignments and removing the auth user).
  3. **Strict HOD Course Assignment Exclusion**:
     - Updated `assignments.service.ts`:
       - `getCoursesAndAssignments`: strictly filters faculty by `role IN ('teacher', 'teaching_staff')` and excludes `hod`.
       - `assignTeacher` and `reassignTeacher`: added backend validation throwing `BadRequestException('HOD cannot be assigned as a course teacher.')` if the selected faculty member is an HOD or outside the department.
     - Updated `TeacherAssignmentTab.tsx`:
       - Added memoized `eligibleFaculty` filter strictly excluding `role === 'hod'`.
       - Added `+ Add Teacher` button and interactive modal in the assignment toolbar.
       - Added `Department Teachers` modal showing department faculty roster with assignment counts and removal actions.
       - Updated canvas and modal dropdowns to prevent HOD from ever appearing as an assignable option.
  4. **Personalized Teacher Dashboard (`/dashboard/teacher`)**:
     - In `faculty.service.ts`:
       - For `user.role === 'teacher'`, queries `teacher_course_assignments` to return only courses assigned to that specific teacher with accurate enrollment counts.
       - In `getClassRoster`, enforces that individual teachers can only view rosters for courses assigned to them (`ForbiddenException` otherwise).
       - General `teaching_staff` retain broad department/campus visibility.
     - In `teacher/page.tsx`:
       - Header badge dynamically displays "Course Teacher" for role `teacher`.
       - Displays assigned course count (`• N Assigned Courses`).
       - Displays a helpful empty state card if no courses have been assigned to the teacher yet by their HOD.

### 15. Fix TypeScript Type Narrowing in TeacherAssignmentTab
- **Files**:
  - `frontend/src/app/dashboard/hod/TeacherAssignmentTab.tsx`
  - `RUN_CHANGES.md`
- **Changes**:
  - Simplified the `eligibleFaculty` filter predicate from `(f.role === 'teacher' || f.role === 'teaching_staff') && f.role !== 'hod'` to `f.role === 'teacher' || f.role === 'teaching_staff'`.
- **Reason**: Fixes IDE and TypeScript compilation error: `"This comparison appears to be unintentional because the types '"teacher" | "teaching_staff"' and '"hod"' have no overlap."` Filter cleanly excludes HOD while satisfying strict TypeScript type narrowing.

### 16. Codebase Cleanup & Obsolete Files Removal
- **Files Removed**:
  - `frontend/tsconfig.tsbuildinfo` (stale build cache)
  - `backend/scripts/backfill-allocations-and-resolve-conflicts.js` (one-off legacy conflict resolver)
  - `backend/scripts/sync-legacy-data.js` (one-off legacy data sync with hardcoded machine paths)
  - `backend/scripts/test_students_bulk.csv` (scratch sample CSV)
  - `backend/src/scripts/debug-allocation.ts` (one-off debug console dump)
  - `backend/src/scripts/fix-blueprints.ts` (one-off blueprint patch script)
  - `backend/src/scripts/seed-campuses.ts` (one-time test database seeder)
  - `backend/src/scripts/seed-test-users.ts` (one-time test account seeder)
  - `backend/src/scripts/test-e2e-flow.ts` (test automation runner)
  - `docs/runs/*` (19 historical individual run files consolidated into this master file; `docs/` directory removed)
- **Files Updated**:
  - `backend/package.json`: Cleaned up `"seed:campuses"`, `"seed:users"`, and `"test:e2e"` scripts.
- **Files Retained**:
  - `.env.real` & `backend/.env.real` (kept per user request)
  - `DATA_BREACH_RESPONSE_PLAN.md` & `DEFERRED_DATA_REQUESTS_SPEC.md` (kept per user request)
- **Reason**: Cleaned up the codebase by removing obsolete, scratch, and temporary files while unifying all project history into a single consolidated changelog.

---

## Historical Runs Master Archive (Consolidated from docs/runs/)

### H.1. Security Hardening & Remediation
- **Database**: Added cascading stored procedures (`delete_campus_cascade`, `delete_department_cascade`, `promote_campus_students`), `updated_at` column to `timetable_generation_jobs`, and threat detection indexes on `audit_logs`.
- **Core Security**: UUID regex validation on failed logins in `audit-logger.service.ts` to prevent dropped audit entries; sliding-window rate limiters with fail-open fallback in `rate-limiter.service.ts`; `@RateLimit()` decorator and `RateLimitGuard`.
- **Auth & Access**: Enforced `must_change_password` 403 blocks in `auth.guard.ts`; tightened CORS in `main.ts`; validated signed JWT claims directly in `frontend/middleware.ts` to block cookie tampering.
- **Controller Throttling**: Protected change-password, registration submit, and AI timetable generation against brute-force and DoS.

### H.2. Attendance Statement Export
- Built PDF statement generation with University letterhead, student profile details, monthly breakdown, and overall attendance percentage using browser print styles.
- Added Excel export for departmental attendance rosters using `exceljs`.

### H.3. Mobile Bottom Navigation & Safe Area Insets
- Implemented mobile navigation in `mobile/app` with React Navigation bottom tabs (`(tabs)/_layout.tsx`).
- Integrated `react-native-safe-area-context` to properly offset navigation bars on devices with home indicators and notches.

### H.4. Campus Morning & Evening Attendance
- Added `campus_sign_ins` schema tracking arrival and departure checkpoints per day.
- Implemented GPS radius geofence check validating student coordinates against campus location.
- Added self sign-in card on Student Dashboard and attendance monitoring in HOD portal.

### H.5. Course Allocation Direct Confirmation Optimization
- Pre-round allocation pass: courses where eligible applicants are less than or equal to total seats are instantly confirmed directly into `student_registrations`, minimizing rounds needed.

### H.6. Course Allocation System (Multi-Round Engine)
- Core allocation algorithm executing 3 rounds for electives:
  - Scoring: Prerequisite completion weight, semester proximity, and frozen submission timestamp tie-breaking.
  - Generates allocation run records with detailed diagnostics in `allocation_runs` and metadata in `student_registrations`.

### H.7. Course Allocation V2 Rules & Preferences
- Extended blueprint schema with prerequisite rules: `COMPLETED_COURSE`, `COMPLETED_SEMESTER`, `MIN_CREDITS`.
- Unified 3-rank preferences in `registration_preferences` with immutable submission timestamp.

### H.8. Credit Ledger & Student Course History
- Built cumulative credit ledger calculating earned, registered, and deficient credits across semesters.
- Renders credit progression bar, categorized breakdown (Major, Minor, MDC, AEC, SEC, VAC), and full academic transcript on student dashboard.

### H.9. Legal, Privacy & Security Policies
- Added compliant `/privacy-policy` and `/terms-of-use` pages with university legal terms, data controller information, and student rights under DPDP Act.
- Added site-wide footer linking legal policies.

### H.10. Mobile Application Architecture
- Configured Expo SDK and TypeScript workspace in `mobile/`.
- Implemented Supabase mobile auth client with secure storage, student registration, and mobile-optimized attendance marking.

### H.11. Privacy Consent Enforcement
- Added mandatory privacy consent modal (`ConsentGate.tsx`) blocking access to dashboard until student accepts policy terms.
- Stores immutable consent records in `privacy_consent_logs`.

### H.12. Teacher Course Assignment & Period Attendance Marking
- HOD drag-and-drop course assignment canvas using `@xyflow/react` connecting faculty nodes to department course nodes.
- Teacher dashboard for selecting assigned papers, viewing class rosters, and marking period-by-period attendance.

### H.13. Unified System & Audit Logging
- Consolidated system event logging across authentication, course allocation runs, and timetable generation.
- Implemented centralized `system_logs` table and SuperAdmin audit viewer with multi-filter search.

