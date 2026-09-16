# Run Summary: Fix False "Registration Window is Closed" & 404 "Not Found" Error (Run 2026-09-16)

## 1. What Was Requested
The user reported that upon accessing the course registration page (`/dashboard/student/register`), even though the registration window is open, the page displayed:
> **Registration Window is Closed**
> **Not Found**

---

## 2. Root Cause Identified
1. **Frontend Error Parsing Bug**:
   In `frontend/src/app/dashboard/student/register/page.tsx`, when `/api/registrations/blueprint` returned an error response, the code read `data.error` instead of `data.message || data.error`. In NestJS standard error format:
   ```json
   {
     "statusCode": 404,
     "message": "No blueprint configured for your semester",
     "error": "Not Found"
   }
   ```
   `data.error` is literally the HTTP status string `"Not Found"`.
2. **Conflation of API Failures with "Window Closed"**:
   Any fetch failure triggered `setPageState('closed')`, forcing the UI to display the hardcoded title `"Registration Window is Closed"` with `{error}` as the subtitle, misleading the user into thinking the window was closed when the issue was an unresolved blueprint or settings query.
3. **Stale/Missing Student Claims & Query Vulnerability**:
   - `auth.guard.ts` did not select `department_id` and `campus_id` from the `students` table for students with existing session claims, potentially leaving `department_id` undefined.
   - `registrations.service.ts` used `.single()` for `campus_settings` and `semester_blueprints`, which fails with PostgREST `PGRST116` if multiple rows exist or if no blueprint has been configured yet by the HOD.

---

## 3. What Was Changed

### Backend
1. [`backend/src/core/auth/guards/auth.guard.ts`](file:///c:/Users/windows/Fyimpcourseregistration/backend/src/core/auth/guards/auth.guard.ts):
   - Updated student query to always fetch `department_id` and `campus_id` authoritatively from the `students` table, guaranteeing complete user metadata on all student requests.
2. [`backend/src/modules/registrations/registrations.service.ts`](file:///c:/Users/windows/Fyimpcourseregistration/backend/src/modules/registrations/registrations.service.ts):
   - In `getBlueprint`, `getPathwaySlots`, and `submitCourses`, added an authoritative fallback query against the `students` table.
   - Switched from `.single()` to `.maybeSingle()` for both `campus_settings` and `semester_blueprints`.
   - Provided clear, actionable error messages identifying the specific department name and semester when settings or blueprints are missing.

### Frontend
1. [`frontend/src/app/dashboard/student/register/page.tsx`](file:///c:/Users/windows/Fyimpcourseregistration/frontend/src/app/dashboard/student/register/page.tsx):
   - Fixed error message extraction to read `data.message || data.error`.
   - Added `'error'` state to `PageState`.
   - Separated the configuration/server error UI from the window closed UI: displays "Registration Unavailable" with the exact backend message and "Try Again" / "Back to Dashboard" buttons instead of the false "Registration Window is Closed" screen.

---

## 4. Verification
- All modified files compiled cleanly with 0 TypeScript/lint errors.
- Dev server hot-reloaded the updated modules.
- Verification steps documented in [`walkthrough.md`](file:///C:/Users/windows/.gemini/antigravity-ide/brain/c4d252df-9562-40f8-9ac3-15c6c892fdf8/walkthrough.md).
