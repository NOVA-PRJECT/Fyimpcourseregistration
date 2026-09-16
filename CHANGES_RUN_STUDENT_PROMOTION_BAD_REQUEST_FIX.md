# Changes Run: Student Promotion "Bad Request" Error Resolution

**Timestamp**: 2026-09-15T14:59:45+05:30  
**Affected Role**: Campus Director  
**Target Area**: Semester Promotion (`/dashboard/director` -> Semester Promotion tab)

---

## 1. Problem Diagnosed
When clicking **"Promote All Students →"** and confirming the multi-step prompts on the Campus Director Dashboard, the operation failed with a generic `Bad Request` error banner.

### Root Causes
1. **Rigid 90-Day Accidental Double-Promotion Guard**:
   In `backend/src/modules/admin/admin.service.ts`:
   ```ts
   if (settings?.last_promoted_at) {
     const lastPromoted = new Date(settings.last_promoted_at);
     const ninetyDaysAgo = new Date();
     ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
     if (lastPromoted > ninetyDaysAgo) {
       throw new BadRequestException('Accidental double-promotion blocked: students have already been promoted within the last 90 days.');
     }
   }
   ```
   Because the campus was previously promoted on 18 July 2026 (~58 days prior), the backend threw a `400 BadRequestException`. Even though the Director went through both Step 1 and Step 2 confirmations, there was no way to authorize an early promotion or override the guard.
2. **Frontend Error Parsing Defect**:
   In `frontend/src/app/dashboard/director/page.tsx`, `handlePromoteStudents` read `data.error` before `data.message`. Because NestJS standard HTTP exceptions return `{ statusCode: 400, message: "...", error: "Bad Request" }`, the frontend displayed `"Bad Request"`, hiding the actual cooldown explanation.

---

## 2. Changes Implemented

### Backend: Admin Module
- **File**: [`backend/src/modules/admin/admin.controller.ts`](file:///c:/Users/windows/Fyimpcourseregistration/backend/src/modules/admin/admin.controller.ts)
  - Updated `@Post('campus/promote-students')` to accept an optional `{ force?: boolean }` request body from the Campus Director.
- **File**: [`backend/src/modules/admin/admin.service.ts`](file:///c:/Users/windows/Fyimpcourseregistration/backend/src/modules/admin/admin.service.ts)
  - Updated `promoteStudents(director: AuthUser, force: boolean = false)`.
  - If `lastPromoted > ninetyDaysAgo` and `!force`, throws a descriptive message specifying the last promotion date and indicating that force override is required.
  - If `force === true`, permits the promotion to execute and records `force: true` in the audit log metadata.
  - Safely parsed RPC return count so template strings format numeric counts cleanly without `[object Object]`.

### Frontend: Director Dashboard
- **File**: [`frontend/src/app/dashboard/director/page.tsx`](file:///c:/Users/windows/Fyimpcourseregistration/frontend/src/app/dashboard/director/page.tsx)
  1. **Accurate Error Parsing**:
     Updated `handlePromoteStudents`, `handleSaveRegistrationWindow`, and `handleCloseImmediately` to prioritize `data.message` (or `data.message.error`) over `data.error`.
  2. **Force Promotion State**:
     Added `forcePromote` state (`boolean`, default `false`).
  3. **Early Promotion Warning & Authorization Checkbox**:
     In Step 2 of the promotion wizard, if `lastPromotedAt` is within the 90-day cooldown period, an amber notice appears with an authorization checkbox:
     `[ ] Authorize force promotion (override 90-day cooldown)`.
     The confirmation button (`Yes, Start New Semester →`) is disabled until the authorization checkbox is checked.
  4. **Clean Success Output**:
     Safely formatted success messages to avoid any `[object Object]` formatting artifacts.

---

## 3. Verification & Results
- **Automated Browser Testing**:
  - Navigated to `http://localhost:3000/dashboard/director` -> Semester Promotion tab.
  - Clicked through Step 1 to Step 2.
  - Verified that Step 2 displays the **Early Promotion Notice** with the 90-day cooldown context and the authorization checkbox.
  - Verified that checking the authorization checkbox enabled the promotion action.
  - Submitted early promotion with force override: request succeeded (`200 OK`) and displayed the clean green banner: `✓ 0 students promoted to next semester`.
- **Evidence Artifacts**:
  - Step 2 Early Promotion Warning: `step2_early_promotion_warning_1789464227580.png`
  - Successful Promotion Result: `semester_promotion_clean_message_1789464534734.png`
  - Browser recording: `verify_clean_success_banner_1789464455885.webp`
