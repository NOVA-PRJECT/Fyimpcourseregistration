# Run Changes

Date: 2026-09-08

### 1. Student Registration Visibility Fix
- **File**: `backend/src/modules/registrations/registrations.service.ts`
- **Change**: Removed the invalid `selected_courses` column from the `.select()` query in `getBlueprint`. Mapped the `existingRegistration` response correctly to `existingReg.preferences`.
- **Reason**: The schema was updated previously and `selected_courses` was dropped, causing the entire query to fail silently (return `null`) and leaving the student unable to see their prior submitted preferences.

### 2. Allocation Run Internal Server Error Details
- **File**: `backend/src/modules/allocation/allocation.service.ts`
- **Change**: Added explicit `logger.error` tracing in `runAllocation` when `allocation_runs` insertion fails. Enhanced the `InternalServerErrorException` to include the raw Supabase error message (e.g. `runErr?.message`).
- **Reason**: The allocation run was previously failing with a generic 500 error on initialization, preventing us from seeing if it was a foreign key violation or missing data constraint on the `campusId` or `userId`. The exact DB constraint error will now propagate to the Director's UI and backend logs for immediate diagnosis.

### 3. Director Timetable Publish Sequence
- **File**: `frontend/src/app/dashboard/director/timetable/page.tsx`
- **Change**: Added a "Publish Timetable" button (green, rocket icon) next to the Export buttons. Implemented `handlePublish()` API call mapping to the backend route `POST /api/timetable/publish`. Added a Confirmation Modal to prevent accidental publishing.
- **Reason**: The user noticed the publish sequence was missing from the Director's dashboard frontend despite the backend API existing.

Please try triggering the allocation and viewing the registration again in the app!
