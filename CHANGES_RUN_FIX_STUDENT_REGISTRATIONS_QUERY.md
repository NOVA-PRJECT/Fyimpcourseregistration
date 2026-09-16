# Run Summary: Fix `student_registrations.preferences` Database Column Error

## What Was Requested
The user reported an error in the Credit Ledger tab:
`Failed to retrieve registration records: column student_registrations.preferences does not exist`
and asked to simplify and avoid overcomplication.

## What Was Changed
1. **`backend/src/modules/credit-ledger/credit-ledger.service.ts`**:
   - Removed `preferences` from the `student_registrations` `.select(...)` query.
   - Reverted `student_registrations` query to the valid schema columns:
     `id, semester, academic_year, slot_1_course_id, slot_2_course_id, slot_3_course_id, slot_4_course_id, slot_5_course_id, slot_6_course_id, total_credits, selections`.
   - Removed the extra `registration_preferences` call to keep data retrieval simple and robust.
   - Preserved direct 14 canonical categories matching, course code resolution, and separate calculation for DSC and DSE.
2. **`RUN_CHANGES.md`**:
   - Appended Run #35 documentation.

## Why
- The `student_registrations` table does not contain a `preferences` column (preferences are stored in `registration_preferences`). Selecting `preferences` from `student_registrations` broke the SQL query.
- Removing it completely resolves the database query failure immediately.

## Verification Performed
- `npx tsc --noEmit` on backend: 0 errors.
- `npx tsc --noEmit` on frontend: 0 errors.

## Manual Verification Steps (For User)
1. Open the Student Dashboard at `http://localhost:3000/dashboard/student`.
2. Click on the **Credit Ledger** tab (Tab 6).
3. Confirm that the error alert is gone and the ledger loads smoothly.
4. Verify that the **Curricular Category Breakdown** shows calculated credits inside each circular loader, including distinct circles for **Discipline Specific Core (DSC)** and **Discipline Specific Elective (DSE)**.
