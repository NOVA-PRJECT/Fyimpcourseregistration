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
