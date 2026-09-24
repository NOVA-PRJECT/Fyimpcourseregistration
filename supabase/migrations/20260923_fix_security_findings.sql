-- Migration: 20260923_fix_security_findings.sql
-- Description: Security hardening migration addressing audit findings FND-02, FND-03, FND-04, and NV-01:
-- 1. FND-02: Drop student direct INSERT policies on campus_sign_ins so sign-in records require backend geofence verification.
-- 2. FND-03: Restrict period_attendance ALL policy so teachers can only mark courses assigned to them (or HOD/director/admin).
-- 3. FND-04: Add attendance_date to period_attendance and update unique constraint to prevent weekly overwrite.
-- 4. NV-01: Enforce campus registration deadline in registration_preferences RLS policies.

-- ============================================================================
-- 1. FND-02: Campus Sign-In Geofence Hardening
-- ============================================================================
-- Drop policies that allowed students to directly insert arbitrary sign-ins
DROP POLICY IF EXISTS "Students insert own campus sign-ins" ON campus_sign_ins;
DROP POLICY IF EXISTS "Students can insert own campus sign-in records" ON campus_sign_ins;

-- Ensure RLS is active on campus_sign_ins
ALTER TABLE campus_sign_ins ENABLE ROW LEVEL SECURITY;

-- Notice: SELECT policy remains active so students can view their attendance history.
-- Staff/Admin manage policies remain active.
-- INSERTs can now ONLY be performed by the backend service_role after GPS haversine distance verification.


-- ============================================================================
-- 2. FND-03: Period Attendance Teacher Scoping Hardening
-- ============================================================================
-- Drop overly permissive policy that let any authenticated faculty tamper with any period attendance
DROP POLICY IF EXISTS "Faculty can mark period attendance" ON period_attendance;
DROP POLICY IF EXISTS "Faculty can mark assigned period attendance" ON period_attendance;

CREATE POLICY "Faculty can mark assigned period attendance"
    ON period_attendance FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM teacher_course_assignments tca
            WHERE tca.teacher_id = auth.uid()
              AND tca.course_id = period_attendance.course_id
        )
        OR EXISTS (
            SELECT 1 FROM faculty f
            JOIN courses c ON c.department_id = f.department_id
            WHERE f.id = auth.uid()
              AND f.role = 'hod'
              AND c.id = period_attendance.course_id
        )
        OR EXISTS (
            SELECT 1 FROM faculty f
            WHERE f.id = auth.uid()
              AND f.role = 'campus_director'
        )
        OR EXISTS (
            SELECT 1 FROM admins a
            WHERE a.id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM teacher_course_assignments tca
            WHERE tca.teacher_id = auth.uid()
              AND tca.course_id = period_attendance.course_id
        )
        OR EXISTS (
            SELECT 1 FROM faculty f
            JOIN courses c ON c.department_id = f.department_id
            WHERE f.id = auth.uid()
              AND f.role = 'hod'
              AND c.id = period_attendance.course_id
        )
        OR EXISTS (
            SELECT 1 FROM faculty f
            WHERE f.id = auth.uid()
              AND f.role = 'campus_director'
        )
        OR EXISTS (
            SELECT 1 FROM admins a
            WHERE a.id = auth.uid()
        )
    );


-- ============================================================================
-- 3. FND-04: Period Attendance Weekly Overwrite Prevention
-- ============================================================================
-- Add attendance_date column to store the specific calendar date the period was conducted
ALTER TABLE period_attendance 
    ADD COLUMN IF NOT EXISTS attendance_date DATE NOT NULL DEFAULT CURRENT_DATE;

-- Drop old unique constraint on (timetable_slot_id, student_id)
ALTER TABLE period_attendance 
    DROP CONSTRAINT IF EXISTS period_attendance_unique;

-- Add new multi-column unique constraint including attendance_date
ALTER TABLE period_attendance 
    ADD CONSTRAINT period_attendance_unique UNIQUE (timetable_slot_id, student_id, attendance_date);

-- Add index on slot and date for performant query lookups
CREATE INDEX IF NOT EXISTS idx_period_att_slot_date 
    ON period_attendance(timetable_slot_id, attendance_date);


-- ============================================================================
-- 4. NV-01: Enforce Registration Deadline in registration_preferences RLS
-- ============================================================================
DROP POLICY IF EXISTS preferences_insert_own ON registration_preferences;
CREATE POLICY preferences_insert_own ON registration_preferences FOR INSERT TO authenticated 
WITH CHECK (
    student_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM students s
        JOIN campus_settings cs ON cs.campus_id = s.campus_id
        WHERE s.id = auth.uid()
          AND (cs.deadline IS NULL OR cs.deadline > NOW())
    )
);

DROP POLICY IF EXISTS preferences_update_own ON registration_preferences;
CREATE POLICY preferences_update_own ON registration_preferences FOR UPDATE TO authenticated 
USING (
    student_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM students s
        JOIN campus_settings cs ON cs.campus_id = s.campus_id
        WHERE s.id = auth.uid()
          AND (cs.deadline IS NULL OR cs.deadline > NOW())
    )
)
WITH CHECK (
    student_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM students s
        JOIN campus_settings cs ON cs.campus_id = s.campus_id
        WHERE s.id = auth.uid()
          AND (cs.deadline IS NULL OR cs.deadline > NOW())
    )
);
