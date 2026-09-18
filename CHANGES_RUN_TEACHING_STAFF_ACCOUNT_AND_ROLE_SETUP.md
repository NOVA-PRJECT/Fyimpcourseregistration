# Changes Run: Teaching Staff Test Account Provisioning & Role Management

Date: 2026-09-18

### What Was Requested
- The user confirmed that the `teacher` role testing was complete and successful.
- The user noted: "next teaching_staff but such nobody in database", requesting active `teaching_staff` accounts in the database to test the `teaching_staff` dashboard and workflow.

### What Was Changed
1. **Automated Bootstrap Provisioning for Teaching Staff**:
   - `backend/src/modules/admin/data-seed.service.ts`:
     - Added `seedTeachingStaffUsers()` called during `onApplicationBootstrap()`.
     - Automatically provisioned and verified the primary test account:
       - **Email**: `teachingstaff@ku.ac.in`
       - **Password**: `TeachingStaff@123`
       - **Role**: `teaching_staff`
       - **Full Name**: `Dr. K. Raman (Teaching Staff)`
       - **Campus**: Mangat Campus (`5b5289d5-17eb-43ba-832e-19883e9eaada`)
       - **Department**: Department of Information Technology (`96a54058-8437-46a3-9815-ae49deab0999`)
     - Ensured internal accounts (`teachingstaff@mangat.internal` and `teachingstaff@thalas.internal`) are synced in Supabase Auth with password `TeachingStaff@123`.

2. **HOD Faculty Creation Role Support**:
   - `backend/src/modules/hod/hod.controller.ts`:
     - Updated `CreateTeacherSchema` to accept optional `role: z.enum(['teacher', 'teaching_staff']).optional().default('teacher')`.
   - `backend/src/modules/hod/hod.service.ts`:
     - Updated `createDepartmentTeacher` to store and assign `role` (`'teacher'` or `'teaching_staff'`), updating both `faculty` table and Supabase Auth `user_metadata` & `app_metadata`.
   - `frontend/src/app/dashboard/hod/TeacherAssignmentTab.tsx`:
     - Enhanced the toolbar button to **Add Faculty**.
     - In the modal, added interactive role choice between **Course Teacher** (Lecture assignments, attendance marking, roster sheets) and **Teaching Staff** (Department curriculum & student roster review).

### Verification
- Queried PostgREST endpoint `/faculty?email=eq.teachingstaff@ku.ac.in` to verify the account is active with role `teaching_staff`.
- Verified that credentials and metadata are correctly set for authentication.

### How to Test
1. Navigate to `http://localhost:3000/login`.
2. Log in with:
   - **Email**: `teachingstaff@ku.ac.in`
   - **Password**: `TeachingStaff@123`
3. Confirm redirection to `/dashboard/teaching_staff`.
4. Inspect curriculum courses, semester filters, and department student rosters.
