# Run Summary: DSC and DSE Credit Calculation & Direct Category Matching

## What Was Requested
The user reported that in the Student Credit Ledger tab, after course allocation has run, credits for **DSE** and **DSC** were not getting calculated. The user emphasized that:
1. **DSC and DSE must be treated as completely different/distinct categories**.
2. **Simplified approach**: Since the database enforces the exact 14 categories (`DSC`, `DSE`, `MDC`, `VAC`, `SEC`, `AEC`, `MOC`, `MOOC`, `INT`, `RPH`, `FWD`, `DSS`, `DMP`, `CIP`), simply check equals on the database category. If not directly matching, check if the course code contains any of the 14 category tags, and accumulate the course's credits into the respective category.

## What Was Changed
1. **`backend/src/modules/credit-ledger/credit-ledger.service.ts`**:
   - Updated `normalizeCategory(rawCategory, courseCode, courseTitle)`:
     - Applies `.trim().toUpperCase()` to `rawCategory` and checks if it equals any of the canonical 14 categories (`DSC`, `DSE`, `MDC`, `VAC`, `SEC`, `AEC`, `MOC`, `MOOC`, `INT`, `RPH`, `FWD`, `DSS`, `DMP`, `CIP`).
     - If not matched directly, checks if `courseCode` contains any of the canonical tags (checking `MOOC` before `MOC` to avoid substring overlap).
     - Title-based keyword fallbacks for `INT`, `RPH`, `FWD`, `DMP`, `CIP`.
   - Updated `getCreditLedger`:
     - Queries both `student_registrations` (flat slots `slot_1_course_id` through `slot_6_course_id`, `preferences`, and `selections`) and `registration_preferences` (`preferences` JSONB) across all semesters.
     - Passes `course_code` into `this.normalizeCategory(c.category, c.course_code, c.title)` during course mapping.
     - Accumulates credits in `catCreditsMap` under `c.normalizedCategory`.
     - Ensures `DSC` and `DSE` are distinct keys in `catCreditsMap` and `categories`.
2. **`backend/src/modules/credit-ledger/credit-ledger.service.spec.ts`**:
   - Replaced outdated test assertions (which previously grouped DSC, DSE, DSS into `'DSC / DSE'`) with separate assertions for `DSC`, `DSE`, and `DSS`.
   - Added test cases verifying course code resolution (`ENG101DSC` -> `DSC`, `CHE201DSE` -> `DSE`, `SW-MOOC-101` -> `MOOC`).
3. **`frontend/src/components/credit-ledger/CreditLedgerView.tsx`**:
   - Ensured category matching in circular progress breakdown handles case and whitespace trimming: `(c.category || '').trim().toUpperCase() === master.category`.
4. **`RUN_CHANGES.md`**:
   - Appended Run #34 summary.

## Why
- Previously, `normalizeCategory` did not accept `courseCode`, and if any course in the database had variations or if `c.category` was slightly non-standard, DSC and DSE credits failed to accumulate.
- Furthermore, querying only `student_registrations` missed any enrolled courses that were stored in `registration_preferences` prior to or during allocation sync.
- Direct matching on the 14 canonical categories and course code tags ensures both DSC and DSE are cleanly distinguished and their credits are reliably accumulated.

## Verification Performed
1. **Automated Unit Tests**:
   - Executed test suite against `CreditLedgerService` with 21 test cases covering all 14 canonical categories, course code tags, and title fallbacks. All 21 tests passed (100%).
2. **TypeScript Compilation**:
   - Ran `npx tsc --noEmit` in `backend`: 0 errors.
   - Ran `npx tsc --noEmit` in `frontend`: 0 errors.

## Follow-up / Manual Verification Steps
Per Rule #4 (Browser Subagent — Opt-In Only), manual verification steps for the user:
1. Navigate to the Student Dashboard at `http://localhost:3000/dashboard/student`.
2. Switch to the **Credit Ledger** tab (Tab 6).
3. Verify that under **Curricular Category Breakdown**:
   - The **Discipline Specific Core (DSC)** circular progress loader displays the student's earned DSC credits inside the circle.
   - The **Discipline Specific Elective (DSE)** circular progress loader displays the student's earned DSE credits inside the circle.
   - Both categories remain separate and distinct with their individual regulation targets (DSC: 60/80 cr, DSE: 24/32 cr).
4. Scroll to **Registered Courses Audit Log** at the bottom:
   - Check that each course has its canonical category (`DSC`, `DSE`, etc.) displayed accurately.
