# Run Changes: Fix Runtime SyntaxError in fetchBlueprint

**Date:** 2026-09-11  
**Status:** Completed & Verified  

---

## 1. Problem Addressed
When an HOD loaded the dashboard or switched semesters in `BlueprintTab.tsx`, an unhandled error crashed the component:
```
Runtime SyntaxError: Failed to execute 'json' on 'Response': Unexpected end of JSON input
    at fetchBlueprint (src/app/dashboard/hod/BlueprintTab.tsx:276:28)
```

### Root Cause
1. In `backend/src/modules/hod/hod.service.ts`, `getBlueprint(semester, user)` queried `semester_blueprints` using `.maybeSingle()`. When no row existed for that semester, it returned `null`.
2. In NestJS (with default Express adapter), returning `null` from a controller endpoint caused Express to send an empty HTTP body (`Content-Length: 0`, string `""`).
3. In `frontend/src/app/dashboard/hod/BlueprintTab.tsx`, `await res.json()` attempted to parse the empty string, throwing `SyntaxError: Unexpected end of JSON input`. Because `fetchBlueprint` had no `try/catch` wrapping the call, the uncaught exception crashed the tab.

---

## 2. Changes Made

### A. Frontend: `frontend/src/app/dashboard/hod/BlueprintTab.tsx`
- **Safe Response Text Parsing**:
  Replaced direct `await res.json()` in `fetchBlueprint` with safe text extraction and conditional JSON parsing:
  ```typescript
  const text = await res.text()
  data = text ? JSON.parse(text) : null
  ```
- **Error Boundary & State Reset**:
  - Wrapped `fetchBlueprint` in `try ... catch ... finally` to ensure that `loading` always clears even during network errors.
  - When `data` is empty or null (no blueprint configured for that semester), cleanly resets `minCredits`, `maxCredits`, and slots to the default empty template (`minCredits: 0`, `maxCredits: 0`, single empty pathway).
- **Harden Secondary Fetch Calls**:
  - `fetchCourses`: Wrapped in `try/catch` with `.catch(() => [])` fallback.
  - `handleSaveBlueprint`: Added `.catch(() => ({}))` fallback.
  - `handleSaveCourse`: Added `.catch(() => ({}))` fallback.
  - `handleDeleteCourse`: Added `.catch(() => ({}))` fallback.

### B. Backend: `backend/src/modules/hod/hod.controller.ts`
- **Valid JSON Response for Empty Blueprints**:
  Updated `@Get('blueprint')` controller method:
  ```typescript
  @Get('blueprint')
  async getBlueprint(@Query('semester') semester: string | undefined, @CurrentUser() user: AuthUser) {
    const sem = semester ? Number(semester) : 1
    const blueprint = await this.hodService.getBlueprint(isNaN(sem) ? 1 : sem, user)
    return blueprint || {}
  }
  ```
  Returns `{}` (status 200, valid JSON) when no blueprint exists, completely preventing 0-byte empty responses.

---

## 3. Files Modified
1. `c:\Users\windows\Fyimpcourseregistration\frontend\src\app\dashboard\hod\BlueprintTab.tsx`
2. `c:\Users\windows\Fyimpcourseregistration\backend\src\modules\hod\hod.controller.ts`
3. `c:\Users\windows\Fyimpcourseregistration\CHANGES_RUN_FIX_FETCH_BLUEPRINT.md` (This file)
