# Run Changes

Date: 2026-09-10 (Branch: ui-works)

### 1. Full UI Integration: 5 Portal Screens
- **Files**:
  - `frontend/src/app/layout.tsx`
  - `frontend/src/app/globals.css`
  - `frontend/src/app/page.tsx` (Screen 1: Welcome Portal)
  - `frontend/src/app/reset-password/page.tsx` (Screen 2: Password Recovery)
  - `frontend/src/app/privacy-policy/page.tsx` (Screen 3: Privacy Policy)
  - `frontend/src/app/login/page.tsx` (Screen 4: Portal Sign In)
  - `frontend/src/app/terms-of-use/page.tsx` (Screen 5: Terms of Use)
- **Changes**:
  - **`layout.tsx`**: Added Google Fonts preconnect and stylesheets (`Newsreader`, `Hanken Grotesk`, `Inter`, and `Material Symbols Outlined`). Configured smooth scrolling and proper metadata.
  - **`globals.css`**: Enabled Tailwind CSS v4 via `@import "tailwindcss";` and configured `@theme` tokens for portal color palette (`primary-container: #082042`, `midnight-text: #0B192C`, `gold-tint: #FFF9EB`, `gold-border: #F3D89A`, surface tones, and typography aliases). Added `.material-symbols-outlined` styles and custom scrollbar behavior.
  - **`page.tsx` (Welcome Portal)**: Implemented the FYIMP Minimal Welcome Portal layout with institutional header, Five-Year Integrated Masters Programme hero tag, Newsreader headline, gold divider (`#E0A92C`), primary CTA ("Access Unified Portal" -> `/login`), secondary CTA ("Academic Guidelines" -> `/terms-of-use`), and institutional footer. Preserved session check logic.
  - **`reset-password/page.tsx` (Password Recovery)**: Implemented institutional card with `#082042` authority header, `lock_reset` icon, gold accent line, email input with `mail` icon, "Send Recovery Link" button with loading state, dismissible success alert banner, and back navigation link to `/login`.
  - **`privacy-policy/page.tsx` (Privacy Policy)**: Implemented institutional 2-column documentation layout with sticky Table of Contents sidebar (13 sections), real-time scrollspy active indicator, version stamp (`Version: 2026-09-08 • Effective: Sept 8, 2026`), academic coordination tool callout, and 13 comprehensive policy clauses with grievance contact point (`prjct.nova2025@gmail.com`).
  - **`login/page.tsx` (Sign In)**: Implemented institutional portal sign-in card with `#082042` header, Kannur University crest, ambient background glow, email and password inputs with password toggle button (`visibility` / `visibility_off`), "Forgot Password?" link (`/reset-password`), Terms & Privacy consent checkbox, and submit button. Fully preserved `/api/auth/login` authentication, error handling, session validation, and role-based redirecting.
  - **`terms-of-use/page.tsx` (Terms of Use)**: Implemented 2-column documentation layout with sticky 10-section sidebar index, scrollspy, header metadata banner, and complete 10 terms clauses including acceptable use warning callouts and contact information.
- **Reason**: Translates the approved institutional design specifications across all 5 entry portal pages while strictly maintaining backend auth compatibility, security policies, and UI consistency on the `ui-works` branch.

### 2. Login Page Central Card & Form Inputs Redesign
- **Files**:
  - `frontend/src/app/login/page.tsx`
  - `frontend/src/app/globals.css`
- **Changes**:
  - **Input Architecture**: Replaced flat colored slab blocks with clean, white input containers (`h-11`, `rounded-lg`, `border-slate-300`, `shadow-sm`), subtle focus rings (`focus-within:border-[#082042] focus-within:ring-2 focus-within:ring-[#082042]/15`), and left structural icons (`mail` for email, `lock` for password in `text-slate-400`).
  - **Browser Autofill**: Added `-webkit-autofill` box-shadow reset in `globals.css` to keep autofilled inputs crisp white without harsh browser default blue/yellow tinting.
  - **Crest & Header**: Upgraded emblem from a square block to an official circular institutional seal (`rounded-full bg-white ring-2 ring-[#E0A92C]/40 p-1.5 shadow-md`). Added clean subtitle and balanced spacing.
  - **Card Structure & Typography**: Broadened card to `max-w-[460px]`, applied `rounded-2xl`, deep layered drop shadow (`shadow-xl shadow-slate-900/8`), and refined label typography (`text-[11px] font-bold uppercase tracking-wider text-slate-700`).
  - **Submit Button**: Elevated CTA with height `h-11`, gold arrow accent (`text-[#E0A92C]`), and subtle hover border.
- **Reason**: Elevates visual quality, legibility, and institutional polish of the central authentication card as requested.

### 3. Revert Central Login Card to Original CSS Module Design
- **Files**:
  - `frontend/src/app/login/page.tsx`
  - `RUN_CHANGES.md`
- **Changes**:
  - **Restored Central Card**: Reverted the central login card in `frontend/src/app/login/page.tsx` back to its original design powered by `login.module.css` (`styles.card`, `styles.cardHeader`, `styles.logoWrapper`, `styles.universityName`, `styles.portalTitle`, `styles.goldLine`, `styles.cardBody`, `styles.formTitle`, `styles.fieldGroup`, `styles.field`, `styles.input`, `styles.submitBtn`).
  - **Password Input & Visibility Toggle**: Aligned password input with `.password-wrapper` and `.password-toggle-btn` utilizing Lucide `Eye` and `EyeOff` icons, perfectly centered and positioned within the input without layout shifts or vertical misalignment.
  - **Preserved System Logic**: Maintained all session verification, `/api/auth/login` authentication, Terms & Privacy Policy acceptance validation, dynamic error extraction, and institutional layout framework.
### 4. Extract Unified PortalHeader & PortalFooter Components with Edge-to-Edge Alignment
- **Files Created**:
  - `frontend/src/components/portal/PortalHeader.tsx`
  - `frontend/src/components/portal/PortalFooter.tsx`
- **Files Updated**:
  - `frontend/src/app/page.tsx` (Screen 1: Welcome Portal)
  - `frontend/src/app/login/page.tsx` (Screen 2: Portal Sign In)
  - `frontend/src/app/reset-password/page.tsx` (Screen 3: Password Recovery)
  - `frontend/src/app/privacy-policy/page.tsx` (Screen 4: Privacy Policy)
  - `frontend/src/app/terms-of-use/page.tsx` (Screen 5: Terms of Use)
  - `RUN_CHANGES.md`
- **Changes**:
  - **Reusable PortalHeader**: Extracted navigation header into `PortalHeader.tsx` featuring the Kannur University insignia, university name, and FYIMP subtitle on the far left, with flexible right-aligned contextual actions (`variant="home"`, `"login"`, `"back"`, or custom `rightAction`).
  - **Reusable PortalFooter**: Extracted footer into `PortalFooter.tsx` featuring the institutional copyright on the far left and legal policy links (`/privacy-policy`, `/terms-of-use`) on the far right.
  - **Edge-to-Edge Left & Right Layout**: Removed the constraining `max-w-7xl mx-auto` centering box from the top bar and bottom bar across all 5 portal pages, utilizing `w-full px-6 md:px-8 flex items-center justify-between` to anchor branding firmly to the left edge and actions/links firmly to the right edge across the full viewport.
  - **Comprehensive Page Integration**: Replaced duplicate inline `<header>` and `<footer>` implementations across all 5 entry pages with the unified `PortalHeader` and `PortalFooter` components.
### 5. Login Central Modal Institutional Branding Realignment
- **Files**:
  - `frontend/src/app/login/page.tsx`
  - `RUN_CHANGES.md`
- **Changes**:
  - **Brand Palette Realignment**: Updated the central authentication modal from legacy `#002147` / `#c9a227` colors to official portal branding: Authority Navy (`#082042`), Warm Institutional Gold (`#E0A92C`), crisp white surface, and slate `#CBD5E1` input borders.
  - **Roundness & Geometry**: Applied `rounded-2xl` with layered drop shadow (`shadow-xl shadow-slate-900/5`) to the modal card container, circular institutional seal badge (`rounded-full bg-white/10 ring-1 ring-white/20 p-2`), and unified `rounded-lg` with `h-11` height across email input, password input, and the Sign In CTA button.
  - **Typography & Iconography**: Upgraded card typography with `Newsreader` serif headline (`font-serif text-2xl text-white font-medium tracking-tight`), uppercase section header, and crisp slate-700 label hierarchy. Added muted slate structural icons (`mail` for email, `lock` for password) and integrated the Lucide `Eye`/`EyeOff` toggle button.
  - **Interactive States & Alert Banners**: Implemented navy glow focus rings (`focus-within:border-[#082042] focus-within:ring-2 focus-within:ring-[#082042]/15`), soft red alert banner (`bg-rose-50 border border-rose-200 text-rose-700`), and gold arrow CTA accent.
  - **Preserved System Logic**: Maintained 100% of session checking, bfcache restoration, authentication posting, consent gate checks, validation, and role-based redirecting.
- **Reason**: Aligns the central login modal's colors, roundness, typography, and input aesthetics directly with the portal design system while preserving the layout and structure.

### 6. Full Reversion of Central Login Card to Original CSS Module Design
- **Files**:
  - `frontend/src/app/login/page.tsx`
  - `RUN_CHANGES.md`
- **Changes**:
  - **Full Revert to CSS Module**: Restored `styles from './login.module.css'` and replaced the central card with the original CSS module structure (`styles.card`, `styles.cardHeader` with `#002147`, `styles.logoWrapper` with `/logo.png`, `styles.universityName`, `styles.portalTitle`, `styles.goldLine` with `#c9a227`, `styles.cardBody`, `styles.formTitle`, `styles.fieldGroup`, `styles.field`, `styles.input`, `styles.submitBtn`, `styles.spinner`, `styles.divider`, `styles.termsWrapper`, `styles.termsCheckbox`, `styles.termsLabel`).
  - **Maintained Shared Header/Footer**: Kept the unified edge-to-edge `PortalHeader` and `PortalFooter` components intact.
  - **Preserved System Logic**: Retained all session validation, authentication handlers, terms checkbox enforcement, and password toggle functionality.
- **Reason**: User requested full reversion of the central login card back to the original style.

### 7. Central Login Modal Typography Alignment with Portal Fonts
- **Files**:
  - `frontend/src/app/login/login.module.css`
  - `RUN_CHANGES.md`
- **Changes**:
  - **Applied Portal Fonts to Modal**: Updated `login.module.css` typography to match the other 5 portal pages:
    - Set `.portalTitle` font-family to `'Newsreader', Georgia, serif` (matching the serif headline styling).
    - Set `.card`, `.universityName`, `.formTitle`, `.label`, `.input`, `.submitBtn`, `.dividerText`, `.errorMsg`, and `.errorBanner` font-family to `'Hanken Grotesk', 'Inter', sans-serif`.
  - **Preserved Exact Styling & Layout**: Strictly kept all existing colors (`#002147`, `#c9a227`), roundness, padding, borders, and input controls unchanged as requested ("dont add anything eklse").
- **Reason**: User requested using the fonts from the other 5 portal pages inside the login modal without altering any other visual styles.

### 8. Fix Backend TS2345 Compilation Error & Port 4000 Connection Refusal
- **Files**:
  - `backend/src/modules/hod/hod.controller.ts`
  - `RUN_CHANGES.md`
- **Changes**:
  - **Type-Casting in `createTeacher`**: In `backend/src/modules/hod/hod.controller.ts` at line 208, cast `parsed.data as any` when invoking `this.hodService.createDepartmentTeacher(parsed.data as any, user)`.
  - **Resolved Root Cause**: Under `strictNullChecks: false` in `backend/tsconfig.json`, Zod's inferred schema types evaluate properties to optional (`{ full_name?: string; ... }`), causing `TS2345` against `createDepartmentTeacher`'s required parameter types. This compile failure prevented NestJS from starting up on `http://127.0.0.1:4000` when `npm run dev` was executed, causing frontend proxy requests to fail with `ECONNREFUSED 127.0.0.1:4000`.
  - **Build Verification**: Executed `npm run build --workspace=backend` (`nest build`) which compiled with 0 errors (exit code 0).

### 9. Remove Footers from All Role Dashboards
- **Files**:
  - `frontend/src/app/dashboard/layout.tsx`
  - `frontend/src/app/dashboard/student/change-password/page.tsx`
  - `RUN_CHANGES.md`
- **Changes**:
  - **Dashboard Root Layout**: Removed `Footer` import and `<Footer />` component rendering from `DashboardRootLayout` in `frontend/src/app/dashboard/layout.tsx`, eliminating the footer across all authenticated role dashboards (`student`, `teacher`/`faculty`, `hod`, `director`, `superadmin`/`admin`).
  - **Student Password Reset Subpage**: Removed the inline copyright paragraph (`<p className={styles.footer}>© 2026 Kannur University • Internal Systems Division</p>`) from `frontend/src/app/dashboard/student/change-password/page.tsx`.
  - **Build Verification**: Executed `npm run build:frontend` (`next build`) which compiled successfully with 0 errors.

---



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

### 17. Google Stitch UI Redesign Specification Document
- **Files Created**:
  - `GOOGLE_STITCH_UI_SPECIFICATION.md`
- **Files Updated**:
  - `RUN_CHANGES.md`
- **Contents**:
  - Authored a comprehensive, layout-agnostic specification of the entire FYIMP course registration and academic governance portal for Google Stitch.
  - Documents institutional purpose, multidisciplinary framework (Major, Minor, MDC, AEC, SEC, VAC), and operational lifecycle.
  - Profiles all 6 user roles (`student`, `teacher`, `teaching_staff`, `hod`, `campus_director`, `superadmin`) and public tier.
  - Inventories all 20+ screens, sub-screens, tabs, and modals with exhaustive data points, attributes, metrics, form fields, and user actions.
  - Strictly omits layout and spatial positioning constraints to grant Google Stitch 100% creative freedom over design aesthetics, visual hierarchy, and interaction metaphors.
### 18. Google Stitch Modular Screen-by-Screen & Tab-by-Tab Prompt Handbook
- **Files Created**:
  - `GOOGLE_STITCH_PROMPTS.md`
- **Files Updated**:
  - `RUN_CHANGES.md`
- **Contents**:
  - Created an exhaustive, modular prompt handbook containing 28 standalone, copy-pasteable prompt blocks specifically calibrated for Google Stitch.
  - Organized sequentially across 6 distinct sections:
    1. **Section 1: Public & Authentication** (Prompts 1.1–1.4: Landing Page, Multi-Role Login, Password Reset, Legal & Compliance Policies).
    2. **Section 2: Student Experience** (Prompts 2.1–2.5: Privacy Consent Gate & Setup, Dashboard Overview & Enrolled Courses, Course Registration & 3-Tier Electives, Credit Ledger & Cumulative Transcript, Geofenced Campus Sign-In).
    3. **Section 3: Course Teacher (Personalized)** (Prompts 3.1–3.3: Personalized Course Hub, Class Roster View, Period Classroom Attendance Marking).
    4. **Section 4: Head of Department (HOD)** (Prompts 4.1–4.8: Overview & Health Metrics, Tab 1 Curriculum Blueprint Builder, Tab 2 Course Catalog & Prerequisites, Tab 3 Faculty Assignment & Teacher Roster, Tab 4 Student Directory & Bulk CSV Upload, Tab 5 Manual Seat Allocation, Tab 6 Campus Attendance Monitoring, Tab 7 Period Attendance Auditing).
    5. **Section 5: Campus Director** (Prompts 5.1–5.6: Governance Overview, Tab 1 Registration Window & Credit Governance, Tab 2 3-Round Allocation Engine, Tab 3 Timetable Generation & Publishing, Tab 4 Student Cohort Promotion, Tab 5 Multi-Department Roster Export).
    6. **Section 6: SuperAdmin** (Prompts 6.1–6.5: Infrastructure Overview, Tab 1 Campus Management, Tab 2 Department Directory, Tab 3 Faculty Directory & Roles, Tab 4 System Audit Logs).
  - Each individual prompt incorporates:
    - Target Role, Screen/Tab identifier, and Functional Purpose.
    - **Current System UI Reference**: Exact codebase file paths, existing UI components, modals, filters, and workflows as a baseline.
    - **Data & Content Entities**: Comprehensive specification of models, stats, metrics, tables, and form inputs.
    - **User Actions**: Primary workflows, mutations, modals, and error/success states.
### 19. Google Stitch Prompts Restructuring (Clutter, Text & Symbols Elimination)
- **Files Updated**:
  - `GOOGLE_STITCH_PROMPTS.md`
  - `RUN_CHANGES.md`
- **Reason**:
  - User observed that screens generated by Google Stitch included unnecessary text paragraphs, developer metadata labels, and messy symbols.
  - Previous prompts contained metadata tags (`Context:`, `Purpose:`, `Current System UI Reference: File: ...`, `Creative Freedom Mandate:`) inside the prompt text blocks, causing Google Stitch to literally render those sentences, file paths, and symbols as visible UI elements.
- **Changes**:
  - Completely restructured all 28 screen and tab prompts across all 6 sections (Public, Student, Teacher, HOD, Director, SuperAdmin).
  - Separated each entry into two clean compartments:
    1. **Current System UI Reference (For Reference Only)**: Stored outside the prompt box, containing exact frontend file paths and existing components for the developer's reference.
    2. **Google Stitch Prompt (Copy-Paste Box)**: Pure, minimal UI prompt containing only essential visual components, clean labels, realistic sample values, clear button text, and explicit anti-clutter directives (`No filler paragraphs, no lorem ipsum, no markdown symbols, and no developer notes`).
  - Completely eliminated all emoji symbols, bullet asterisks, complex markdown nesting, and backend developer jargon from inside the copy-paste boxes.

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

### H.14. UI Works Feature Branch Setup
- Created and checked out new dedicated Git branch `ui-works` branching off from `sub-main`.
- Prepared the workspace for upcoming UI enhancement and design work.

