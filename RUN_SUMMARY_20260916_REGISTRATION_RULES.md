# Run Summary: Restrict Registration Slot Resolution Strictly to Blueprint Rules

**Date**: 2026-09-16  
**Module**: Course Registration (Student Flow)

---

## 1. What was requested
- Resolve the issue where IT Semester 1 students could not view papers for Minor 1 (Slot 2) and Minor 2 (Slot 3) in the course registration page (`/dashboard/student/register`).
- Enforce the system architectural design rule: **Course prerequisite rules (`course_prerequisite_rules`) are only for allocation scoring purposes; registration must only and strictly consider blueprint rules.**

---

## 2. What was changed
- **File Modified**:
  - [`backend/src/modules/registrations/registrations.service.ts`](file:///c:/Users/windows/Fyimpcourseregistration/backend/src/modules/registrations/registrations.service.ts)
- **High-Level Changes**:
  1. **Removed `course_prerequisite_rules` evaluation from Registration**:
     - Removed the database query to `course_prerequisite_rules` and the `isCourseAllowedForStudent` check from `resolvePathwaySlots`.
     - Prerequisite rules (`DEPARTMENT`, `COMPLETED_COURSE`, `COMPLETED_SEMESTER`) are preserved for the multi-round allocation engine in `allocation.service.ts`.
  2. **Enforced Blueprint-Only Filtering**:
     - Slot course options for `DEPT_RESTRICTED`, `EXCLUDE_DEPT`, `POOL_RESTRICTED`, and `GLOBAL_BASKET` are now filtered exclusively through `isCourseEligibleForSlot`, respecting the curricular blueprint configured by the department/HOD.
  3. **Case-Insensitive Department Mapping**:
     - Enhanced `deptMap` in both `getBlueprint` and `getPathwaySlots` to index department IDs by original code, uppercase code, lowercase code, and ID.

---

## 3. Why
- Previously, `resolvePathwaySlots` in `RegistrationsService` queried `course_prerequisite_rules` and checked if the student's department matched any `DEPARTMENT` prerequisite rules on courses.
- Courses from external departments (e.g., Mathematics and Statistics courses) often define department prerequisite rules for their own majors.
- Because an IT student's department code (`IT`) did not match `MAT` or `STA`, the registration service incorrectly disqualified those courses from the IT student's Minor 1 and Minor 2 slots, rendering the dropdowns empty and blocking registration submission.
- Removing this check during registration allows students to register preferences for all blueprint-eligible minor and elective courses, leaving prerequisite rule scoring to the allocation engine.

---

## 4. Verification & Follow-Up
- **Verification**:
  - `KU01DSCMAT101` (Logic and Set Theory, 4 Credits) and `KU01DSCSTA101` (Descriptive Statistics, 4 Credits) are now properly resolved and available for IT S1 Minor 1 and Minor 2 slots.
  - Credit total sums to 21 credits (`4 + 4 + 4 + 3 + 3 + 3`), meeting the blueprint bounds (`min_credits: 21`, `max_credits: 21`).
- **Follow-up / Manual Verification Steps**:
  1. Open `/dashboard/student/register` as an IT S1 student.
  2. Verify that Minor 1 displays `KU01DSCMAT101` and Minor 2 displays `KU01DSCSTA101`.
  3. Select or review auto-selected papers across all slots.
  4. Submit or update registration and confirm success.
