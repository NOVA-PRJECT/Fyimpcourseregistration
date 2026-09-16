# Changes Run: Timetable Generation "Bad Request" Error Resolution

**Timestamp**: 2026-09-14T16:06:20+05:30  
**Affected Role**: Campus Director  
**Target Area**: Timetable Generator (`/dashboard/director/timetable`)

---

## 1. Problem Diagnosed
When clicking **"⚡ Generate AI Timetable"** on the Campus Director Timetable page, the application resulted in an HTTP `400 Bad Request` error toast and the overlay was left trapped displaying `Bad Request`.

### Root Causes
1. **Backend Registration Window Guard**:
   In `backend/src/modules/timetable/timetable.service.ts` (`generate` method), the backend enforces that student registrations must be closed before timetable generation:
   ```ts
   if (campusSettings?.deadline) {
     const deadline = new Date(campusSettings.deadline);
     if (new Date() < deadline) {
       throw new BadRequestException(
         `Registration window is still open until ${deadline.toLocaleString('en-IN')}. Please close registrations before generating timetable.`,
       );
     }
   }
   ```
2. **Frontend Error Parsing Defect**:
   In `frontend/src/app/dashboard/director/timetable/page.tsx`, `handleGenerate` extracted `data.error` before `data.message`. Because NestJS standard HTTP exceptions serialize to `{ statusCode: 400, message: "...", error: "Bad Request" }`, `data.error` evaluated to `"Bad Request"`, suppressing the explanatory message from the user.
3. **No Inline Resolution or Registration State Feedback**:
   The Timetable Generator page did not display the registration window status or provide any way to close the window without navigating away to the main director dashboard.

---

## 2. Changes Implemented

### Frontend: Timetable Generator Page
- **File**: [`frontend/src/app/dashboard/director/timetable/page.tsx`](file:///c:/Users/windows/Fyimpcourseregistration/frontend/src/app/dashboard/director/timetable/page.tsx)
  1. **Accurate Error Parsing**:
     Updated error handling across generation and status flows so that `data.message` (or `data.message.error`) is prioritized over `data.error`.
  2. **Registration Window Status Tracking**:
     Tracked `currentDeadline`, `closingWindow`, and `registrationClosed` directly from `/api/director/settings`.
  3. **Amber Notice Banner**:
     Rendered an informative notice banner above the controls card when registrations are open:
     - Displays the exact deadline (`8/10/2026, 8:29:00 pm`).
     - Includes a **`Close Window Now →`** 1-click button.
  4. **Interactive Confirmation Modal on Generate**:
     When the Director clicks **"⚡ Generate AI Timetable"** while registrations are open, a confirmation modal appears:
     - Clear explanation of why registrations must be closed.
     - **`Close Window & Generate ⚡`** button: closes the window via `PUT /api/director/settings` and immediately triggers generation.
     - **`Cancel`** button to dismiss.
  5. **Generation Overlay Error Handling & Dismissal**:
     - Subtitle and icon reflect error states cleanly.
     - Always displays the **`Close Overlay`** button and **`⚡ Retry Generation`** button on errors so the overlay is never stuck.

### Frontend: Timetable Styling
- **File**: [`frontend/src/app/dashboard/director/timetable/timetable.module.css`](file:///c:/Users/windows/Fyimpcourseregistration/frontend/src/app/dashboard/director/timetable/timetable.module.css)
  - Added `.registrationWarningBanner`, `.registrationWarningContent`, `.registrationWarningIcon`, `.registrationWarningTitle`, `.registrationWarningText`, and `.closeWindowQuickBtn` styles matching the KU Navy and Amber palette.

---

## 3. Verification & Results
- **Automated Browser Test**:
  - Navigated to `http://localhost:3000/dashboard/director/timetable`.
  - Zero compilation errors, zero console errors.
  - Verified the amber warning banner is rendered properly with active deadline.
  - Verified clicking **`⚡ Generate AI Timetable`** triggers the confirmation modal instead of failing with `Bad Request`.
  - Verified modal cancelation and clean state retention.
- **Evidence Artifacts**:
  - Confirmation Modal: `modal_reg_open_1789382135021.png`
  - Warning Banner: `timetable_warning_banner_1789382148165.png`
  - Recording: `verify_timetable_fix_1789382111145.webp`
