# Run Summary: Teaching Staff Superadmin Exclusivity & Campus Singleton Enforcement

## 1. What was requested
- Restrict `teaching_staff` account creation exclusively to the `superadmin` role, as originally designed.
- Remove `teaching_staff` account creation options from the HOD dashboard so HODs can only add Course Teachers (`role: 'teacher'`).
- Enforce the business rule that each campus must have strictly **one** `teaching_staff` account (campus-wide general staff with `department_id: null`, mirroring the singleton model of Campus Directors).

---

## 2. What was changed

### A. Frontend HOD Dashboard
- **[`frontend/src/app/dashboard/hod/TeacherAssignmentTab.tsx`](file:///c:/Users/windows/Fyimpcourseregistration/frontend/src/app/dashboard/hod/TeacherAssignmentTab.tsx)**:
  - Reverted the "Add Course Teacher" modal to eliminate role selection radio buttons (`teacher` vs `teaching_staff`).
  - Reverted `handleCreateTeacher` to submit only `{ full_name, email, password }` without a role payload.
  - Reverted the toolbar action button label from "+ Add Faculty" to `<Plus size={15} /> Add Teacher`.
  - Reverted modal header title to "Add Course Teacher" with updated descriptive subtitle.

### B. Backend HOD Module
- **[`backend/src/modules/hod/hod.controller.ts`](file:///c:/Users/windows/Fyimpcourseregistration/backend/src/modules/hod/hod.controller.ts)**:
  - Reverted `CreateTeacherSchema` to strictly validate `full_name`, `email`, and `password`.
- **[`backend/src/modules/hod/hod.service.ts`](file:///c:/Users/windows/Fyimpcourseregistration/backend/src/modules/hod/hod.service.ts)**:
  - Reverted `createDepartmentTeacher` to hardcode `role: 'teacher'` for both Supabase Auth metadata and the `faculty` database record, ensuring HODs can never provision campus-level staff.

### C. Backend Superadmin Faculty Management & Singleton Guard
- **[`backend/src/modules/admin/admin.service.ts`](file:///c:/Users/windows/Fyimpcourseregistration/backend/src/modules/admin/admin.service.ts)**:
  - Added singleton check in `createFaculty`: If `role === 'teaching_staff'`, queries the `faculty` table for any existing `teaching_staff` record with the same `campus_id`. If one exists, rejects with `BadRequestException('This campus already has an assigned Teaching Staff account. Only one Teaching Staff account is permitted per campus.')`.
  - Added duplicate prevention in `updateFaculty`: Ensures a faculty member cannot be switched to `teaching_staff` if another `teaching_staff` record already exists for that campus.
  - Enforced `department_id: null` in both `createFaculty` and `updateFaculty` when `role === 'teaching_staff'` or `role === 'campus_director'`.
  - Updated return message for `createFaculty` to show `'Teaching Staff account created successfully'`.

### D. Data Seed Service & Database Cleanup
- **[`backend/src/modules/admin/data-seed.service.ts`](file:///c:/Users/windows/Fyimpcourseregistration/backend/src/modules/admin/data-seed.service.ts)**:
  - Updated `seedTeachingStaffUsers()` to maintain strictly 2 test accounts (1 per campus):
    - Mangat Campus: `teachingstaff@ku.ac.in` (`department_id: null`, campus `5b5289d5-17eb-43ba-832e-19883e9eaada`, password: `TeachingStaff@123`)
    - Thalas Campus: `teachingstaff@thalas.internal` (`department_id: null`, campus `feed55c6-deea-46b7-9fa1-a97cfabf0838`, password: `TeachingStaff@123`)
  - Added cleanup logic to delete any legacy `teachingstaff@mangat.internal` record from `faculty` and auth.
- **Database (Supabase)**:
  - Deleted redundant `teachingstaff@mangat.internal` record from the `faculty` table.
  - Updated `teachingstaff@ku.ac.in` so `department_id` is `null` (campus-level staff).
  - Verified `GET /faculty?role=eq.teaching_staff` returns exactly 2 records (1 per campus).

### E. Frontend Superadmin UI Refinement
- **[`frontend/src/app/dashboard/superadmin/page.tsx`](file:///c:/Users/windows/Fyimpcourseregistration/frontend/src/app/dashboard/superadmin/page.tsx)**:
  - Updated `openEditFaculty` to typecast and accept `teaching_staff`.
  - In `handleUpdateFaculty`, passed `campus_id` to the PUT endpoint to support campus singleton validation.
  - In edit modal, cleared `editFacultyDeptId` whenever switching away from HOD to either `campus_director` or `teaching_staff`.

---

## 3. Why
- **Role Scoping**: In the university domain model, a Course Teacher (`role: 'teacher'`) belongs to a specific department and teaches assigned course slots. A Teaching Staff (`role: 'teaching_staff'`) is a campus-level general academic role (similar to Campus Director) who has visibility across all departments in the campus. Therefore, only the Superadmin should have the authority to provision campus-level staff accounts.
- **Singleton Invariant**: Each campus operates with one general Teaching Staff account to supervise campus offerings. Allowing multiple accounts per campus caused data inconsistency and ambiguity in course inspection.

---

## 4. Verification & Follow-up
- **Automated / Database Verification**:
  - Queried Supabase PostgREST for `/faculty?role=eq.teaching_staff`: Confirmed exactly 1 record for Mangat campus (`teachingstaff@ku.ac.in`) and 1 record for Thalas campus (`teachingstaff@thalas.internal`).
- **Manual Verification Steps** (Browser Subagent is opt-in only per rule 4):
  1. Open `http://localhost:3000/login` and sign in as HOD (`hod.mangat.cs@ku.ac.in` / `HodMangatCS@123` or your active HOD).
  2. Navigate to "Teacher Assignment" tab and click "+ Add Teacher".
  3. Confirm that the modal is strictly titled "Add Course Teacher" with fields for Name, Email, and Initial Password (no role selector). Submitting creates a teacher bound to the department with `role: 'teacher'`.
  4. Sign in as Superadmin (`admin@ku.ac.in`).
  5. Go to Faculty Management and attempt to add a second Teaching Staff member to Mangat Campus.
  6. Confirm that the backend returns 400 Bad Request stating only one Teaching Staff account is permitted per campus.
  7. Sign in as Teaching Staff (`teachingstaff@ku.ac.in` / `TeachingStaff@123`).
  8. Confirm access to `http://localhost:3000/dashboard/teaching_staff` with campus-level view across departments.
