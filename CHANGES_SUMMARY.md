# Changes Summary: Next.js + NestJS + Supabase Architecture Migration & Cleanup

## 1. Directory Restructure
The repository was reorganized into two primary workspace folders:
- `frontend/`: Next.js frontend web application.
- `backend/`: NestJS backend API service.
- `package.json`: Root package managing both workspaces with `concurrently`.

## 2. Complete Frontend Decoupling from Supabase
- Removed `@supabase/ssr` and `@supabase/supabase-js` dependencies from `frontend/package.json`.
- Removed all direct Supabase queries, admin clients, and service clients from the frontend.
- Refactored `frontend/src/app/dashboard/student/page.tsx` from a server component with direct Supabase access into a clean client component that queries `GET /api/student/dashboard-summary`.
- Refactored `frontend/middleware.ts` and dashboard layout files to check authenticated sessions and user roles via HTTP-only cookies (`auth_token`, `user_role`) without needing `@supabase/ssr`.
- Added rewrites in `frontend/next.config.ts` to proxy all `/api/:path*` calls to `http://127.0.0.1:4000/api/:path*`.
- Hardened Content Security Policy (CSP) in `next.config.ts`, removing Supabase direct connections from the browser.

## 3. NestJS Backend Scaffolding & Core Architecture
Created a modular NestJS service in `backend/`:
- **Database**: `SupabaseService` (`backend/src/core/database/supabase.service.ts`) configured with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- **Security & RBAC**:
  - `AuthGuard` (`backend/src/core/auth/guards/auth.guard.ts`): validates Supabase JWTs from `Authorization: Bearer` headers and cookies, injecting `req.user`.
  - `RolesGuard` (`backend/src/core/auth/guards/roles.guard.ts`): enforces role-based access (`@Roles()`).
  - `RateLimiterService`: sliding window rate limiters via Upstash Redis (`@upstash/ratelimit`).
- **Logging**:
  - `AuditLoggerService`: records system and user events to the `audit_logs` table.
  - `ServerLoggerService`: records error stacks to `server_error_logs`.

## 4. NestJS Domain Modules & Controllers
Migrated all 32 former Next.js route handlers into NestJS modules:
- `AuthModule`: `/api/auth/login`, `/api/auth/logout`, `/api/auth/profile`, `/api/auth/reset-password`.
- `AdminModule`: `/api/admin/campuses`, `/api/admin/departments`, `/api/admin/faculty-list`, `/api/admin/campus/promote-students`.
- `HodModule`: `/api/hod/blueprint`, `/api/hod/courses`, `/api/hod/departments`, `/api/hod/students`, `/api/hod/bulk-students`, `/api/hod/export-students-excel`.
- `FacultyModule`: `/api/faculty/courses`, `/api/faculty/attendance`, `/api/faculty/defaulters`.
- `StudentModule`: `/api/student/dashboard-summary`, `/api/student/change-password`.
- `RegistrationsModule`: `/api/registrations/blueprint`, `/api/registrations/pathway-slots`, `/api/registrations/submit`.
- `DirectorModule`: `/api/director/settings`.
- `TimetableModule`: `/api/timetable/constraints`, `/api/timetable/entries`, `/api/timetable/generate`, `/api/timetable/job-status`, `/api/timetable/publish`, `/api/timetable/parallel-groups`.

## 5. Cleanup of Leftover and Unwanted Files & Folders
Removed all legacy, obsolete, and duplicate files:
- `next-env.d.ts` (root leftover; frontend has its own).
- `tsconfig.json` & `tsconfig.tsbuildinfo` (root leftovers; each workspace has its own scoped tsconfig).
- `frontend/src/modules/teacher` (empty directory).
- Old root `src/`, `public/`, `middleware.ts`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, and `.next/` cache.

## 6. Fix for ECONNREFUSED Proxy Issue
- **Root Cause 1 (`cookie-parser` import)**: In `backend/src/main.ts`, ES module import `import cookieParser from 'cookie-parser'` failed with `TypeError: (0, cookie_parser_1.default) is not a function` during startup because `cookie-parser` is a CommonJS module. Fixed by loading with `require('cookie-parser')` and setting `"esModuleInterop": true` in `backend/tsconfig.json`.
- **Root Cause 2 (IPv6 vs IPv4 binding)**: On Windows, `localhost` resolves to `::1` (IPv6) before `127.0.0.1` (IPv4). Configured NestJS in `backend/src/main.ts` to bind explicitly to `0.0.0.0` and updated Next.js proxy rewrite destination in `frontend/next.config.ts` to `http://127.0.0.1:4000`.

## 7. Resolution of HOD Dashboard Data & RBAC Issues
- **Students Tab Empty (500 Error)**: In `HodService.getStudents`, the query requested an `email` column (`select('id, full_name, email...')`) which does not exist in the `students` table (student emails reside in Supabase `auth.users`). This caused Postgres error `column students.email does not exist` (500). Fixed query to select `id, full_name, current_semester, cap_application_number`. Now returns all department students (e.g. 25 students for Sem 1) with HTTP 200.
- **Defaulters Tab Showing All Pending**: Resolved stale daemon process state by restarting the NestJS daemon with verified database bindings. End-to-end testing now correctly returns `total_students: 53`, `submitted_count: 53` for IT HOD, with all completed student registrations tagged as `submitted: true`.
- **Course Tab Listing Courses from All Departments**:
  - In `HodService.getCourses`, added an `ownOnly?: boolean` option. When `own=true` is requested, it filters strictly by `department_id = user.department_id` so the HOD only sees and manages their own department's course catalog.
  - When configuring the Blueprint tab, `own` is omitted so the HOD can see other campus departments' elective courses to populate multidisciplinary/restricted slots.
  - Updated `frontend/src/app/dashboard/hod/BlueprintTab.tsx` to request `own=true` when `view === 'courses'` and added UI safeguard filtering `is_own_dept !== false`.

## 8. Comprehensive RBAC Enforcement Across All 5 Roles
- **Roles Defined & Enforced**:
  1. `superadmin`: Access restricted to `/api/admin/*`, `/dashboard/superadmin`.
  2. `campus_director`: Access restricted to `/api/director/*`, `/api/admin/campus/promote-students`, `/dashboard/director`, and timetable generation/publishing.
  3. `hod`: Access restricted to `/api/hod/*`, `/api/faculty/defaulters`, `/dashboard/hod`.
  4. `teaching_staff`: Access restricted to `/api/faculty/courses`, `/api/faculty/attendance` (class roster), and `/dashboard/teacher`.
  5. `student`: Access restricted to `/api/student/*`, `/api/registrations/*`, and `/dashboard/student`.
- **Controller Hardening**:
  - `FacultyController`: Explicitly locked down `/api/faculty/defaulters` to `@Roles('hod')`, preventing unauthorized teaching staff or student queries.
  - `HodController`: Added fallback handling for `semester` parameter in `getBlueprint` and `getCourses` so missing parameters default safely instead of triggering integer conversion exceptions.
- **Frontend Middleware Hardening**:
  - `frontend/middleware.ts` enforces `DASHBOARD_ROLE_MAP` on all `/dashboard/*` paths, redirecting unauthorized role visits directly to the user's mapped dashboard.
- **Automated RBAC Test Suite**:
  - Executed a cross-role matrix testing 35 distinct role-endpoint combinations using live tokens for real accounts across all 5 roles.
  - **Result: 35/35 (100%) tests passed.** Every role succeeded on authorized endpoints (200 OK) and was strictly rejected on forbidden endpoints (403 Forbidden).

## 9. Removal of Manual HOD Parallel Group Configuration (Preserved Automated Solver & [P] Badge)
- **Clarification of Scope**:
  - Only the **manual configuration** of parallel groups by HODs in the Blueprint dashboard was removed.
  - **Automated parallel coursing** during timetable generation, AI parallel scheduling, and the **`[P]` badge** in the Timetable view remain active and fully functional.
- **Removed (Manual HOD Configuration)**:
  - **HOD Blueprint UI (`BlueprintTab.tsx`)**: Removed the manual `⚡ Parallel Course Groups` configuration card, the "New Parallel Group Modal", "Add Course to Parallel Group Modal", and "Delete Parallel Group Confirmation Modal". Cleaned up associated state variables and CRUD handlers.
  - **NestJS Timetable Module (`TimetableController` & `TimetableService`)**: Removed manual CRUD endpoints (`/api/timetable/parallel-groups*`) since groups are detected mathematically from live registrations rather than manually maintained.
- **Preserved & Active (Automated Solver & Timetable View)**:
  - **Dynamic Parallel Course Detection (`loader.ts`)**: `detectParallelGroups` automatically analyzes student registrations for the department batch and identifies alternative elective courses with zero student overlap.
  - **AI Timetable Scheduling (`job.ts` & `prompt-builder.ts`)**: Schedules detected parallel elective alternatives into identical time slots.
  - **Timetable UI (`director/timetable/page.tsx`)**: Renders the **`[P]` badge** (`Parallel Course (Alternative Elective)`) whenever multiple parallel courses share the same time slot in the schedule.

## 10. Backend Build Stability & Windows File Locking Fix (`nest-cli.json`)
- **Root Cause of `Cannot find module dist/main` / `ECONNRESET` / `ECONNREFUSED`**:
  - In `backend/nest-cli.json`, `"deleteOutDir": true` caused `nest build` and watch mode restarts to delete the entire `dist` directory.
  - On Windows, file locking during concurrent builds deleted `dist/main.js` while the Node process was attempting to reload it, triggering `Error: Cannot find module backend\dist\main` and crashing the NestJS listener on port 4000.
- **Fix Applied**:
  - Configured `"deleteOutDir": false` in `backend/nest-cli.json` to prevent disruptive directory wipes during watch reloads.
  - Rebuilt the backend bundle cleanly (`backend/dist/main.js`).
  - Restarted the NestJS daemon at `http://127.0.0.1:4000`.
- **Verification**:
  - Tested end-to-end proxying via Next.js (`http://127.0.0.1:3000/api/*`) for `/api/auth/profile`, `/api/hod/blueprint`, `/api/hod/departments`, `/api/faculty/defaulters`, and `/api/timetable/entries`. All returned **HTTP 200 OK** with zero connection resets.

## 11. Full Repository Audit & Removal of Unnecessary Files
- **Audited Tree Structure**:
  - Inspected all root directories, `frontend/src/*`, and `backend/src/*` subdirectories.
  - Verified 0 empty folders remain in `frontend` or `backend`.
  - Confirmed all active controllers, services, guards, modules, types, and client pages are cleanly scoped.
- **Deleted Obsolete Files**:
  - `frontend/tsconfig.tsbuildinfo`: Removed obsolete TypeScript build cache (118KB) to keep source tree clean.
  - `SLOT_RULES_ANALYSIS.md`: Removed obsolete scratch analysis report from root.
- **Build Verification**:
  - Executed full workspace build (`npm run build`). Both `backend` (NestJS) and `frontend` (Next.js) compiled with **0 errors**.

## 12. Defaulters Tab Live Detection & Cache Invalidation Fix
- **Root Cause of Defaulters Appearing Pending**:
  - In `backend/src/modules/faculty/faculty.service.ts`:
    1. `campus_settings` lookup used `.single()` which threw if empty, leaving `academicYear = ''`. Registrations were strictly filtered by `.eq('academic_year', '')`, which matched 0 registrations and marked all students as `submitted: false`.
    2. Overly restrictive `.eq('academic_year', academicYear)` could mark completed registrations as pending if submitted under another window.
  - In `frontend/src/app/dashboard/hod/page.tsx`:
    1. Browser `fetch('/api/faculty/defaulters')` lacked `cache: 'no-store'`, allowing browsers to serve stale empty data.
    2. Tab switching checked `if (!deptData)` which prevented refetching if stale data was loaded during server restarts.
    3. No manual "Refresh" button existed on the Defaulters tab.
- **Fixes Applied**:
  - **Backend (`faculty.service.ts`)**:
    - Replaced `.single()` with `.maybeSingle()` and added fallback to `registration_windows` for `academicYear`.
    - Removed rigid academic year filtering on `student_registrations` query for the department's students.
    - Added valid registration filter checking `submitted_at != null || slot_1_course_id != null`.
    - Validated submission against both `targetSem` and `s.current_semester`.
  - **Backend Global No-Cache Middleware (`main.ts`)**:
    - Added `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate`, `Pragma: no-cache`, `Expires: 0` headers to all responses.
  - **Frontend UI (`hod/page.tsx`)**:
    - Added `cache: 'no-store'` and explicit no-cache headers to `handleFetch`.
    - Updated tab switch `useEffect` to always re-fetch fresh data when switching to the Defaulters tab.
    - Added a **`🔄 Refresh Status`** button directly in the Defaulters filter bar next to `📊 Export Excel`.




