# Changes — HOD Dashboard Bug Fixes (Run 2026-09-11)

## Frontend Changes

### 1. CampusAttendanceTab.tsx — Removed CAP Number Column
- Removed th CAP Application No header
- Removed td cell rendering cap_application_number
- Table now: #, Student Name, Sem, Morning Checkpoint, Evening Checkpoint

### 2. ManualAllocationTab.tsx — Converted Dark to Light Theme
- All container backgrounds: rgba(15,23,42,0.65) to #ffffff
- All card backgrounds: #1e293b to #f8fafc
- All borders: #334155 to #e2e8f0
- All headings: #f8fafc to #002147
- All body text: #94a3b8/#cbd5e1 to #64748b/#475569
- Accent color: #38bdf8/#0284c7 to #1e40af
- Error/success banners: transparent rgba to solid light backgrounds
- Modal: dark overlay/background to light overlay/white background
- Select/inputs: dark backgrounds to white backgrounds
- Progress bar tracks: #0f172a to #e2e8f0

## Pending Database Migrations

### Faculty Role Constraint (Issue 1)
Run in Supabase SQL Editor:
ALTER TABLE faculty DROP CONSTRAINT IF EXISTS faculty_role_check;
ALTER TABLE faculty ADD CONSTRAINT faculty_role_check CHECK (role IN ('hod', 'campus_director', 'teaching_staff', 'teacher'));

### Period Attendance Tables (Issue 2)
Run supabase/migrations/20260908_assignments_and_period_marking.sql in Supabase SQL Editor.
