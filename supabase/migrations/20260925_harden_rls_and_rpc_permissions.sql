-- =============================================================================
-- Migration: 20260925_harden_rls_and_rpc_permissions.sql
-- Description: Security hardening — Environment-agnostic RLS policy cleanup.
--   1. Drop all dangerous "authenticated_all_*" permissive policies
--   2. Re-assert correct least-privilege per-table policies
--   3. Restrict EXECUTE on SECURITY DEFINER RPCs to service_role only
-- =============================================================================

-- =============================================================================
-- PART 1: DROP ALL "authenticated_all_*" AND "authenticated_select_*" POLICIES
-- These grant blanket access to all authenticated users and must be removed.
-- Per-table policies with proper constraints are re-asserted in Part 2.
-- =============================================================================
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "authenticated_all_%I" ON %I;', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "authenticated_select_%I" ON %I;', t, t);
    END LOOP;
END;
$$;


-- =============================================================================
-- PART 2: RE-ASSERT CORRECT LEAST-PRIVILEGE POLICIES (Idempotent)
-- Each block drops-if-exists then creates the correct policy.
-- Policies from earlier migrations are re-asserted here to ensure they
-- survive even if the seed was accidentally run after migrations.
-- =============================================================================

-- ─── Reference Data: Read-only for all authenticated users ───────────────────

-- campuses
DROP POLICY IF EXISTS campuses_select_auth ON campuses;
CREATE POLICY campuses_select_auth ON campuses
    FOR SELECT TO authenticated USING (true);

-- departments
DROP POLICY IF EXISTS departments_select_auth ON departments;
CREATE POLICY departments_select_auth ON departments
    FOR SELECT TO authenticated USING (true);

-- campus_settings
DROP POLICY IF EXISTS campus_settings_select_auth ON campus_settings;
CREATE POLICY campus_settings_select_auth ON campus_settings
    FOR SELECT TO authenticated USING (true);

-- courses
DROP POLICY IF EXISTS courses_select_auth ON courses;
CREATE POLICY courses_select_auth ON courses
    FOR SELECT TO authenticated USING (true);

-- semester_blueprints
DROP POLICY IF EXISTS blueprints_select_auth ON semester_blueprints;
CREATE POLICY blueprints_select_auth ON semester_blueprints
    FOR SELECT TO authenticated USING (true);

-- course_prerequisite_rules
DROP POLICY IF EXISTS prereq_select_auth ON course_prerequisite_rules;
CREATE POLICY prereq_select_auth ON course_prerequisite_rules
    FOR SELECT TO authenticated USING (true);

-- time_slots
DROP POLICY IF EXISTS timetable_slots_select_auth ON time_slots;
CREATE POLICY timetable_slots_select_auth ON time_slots
    FOR SELECT TO authenticated USING (true);

-- timetable_entries
DROP POLICY IF EXISTS timetable_entries_select_auth ON timetable_entries;
CREATE POLICY timetable_entries_select_auth ON timetable_entries
    FOR SELECT TO authenticated USING (true);


-- ─── User Profile Tables: Own-record access ─────────────────────────────────

-- students: read own record
DROP POLICY IF EXISTS students_select_own ON students;
CREATE POLICY students_select_own ON students
    FOR SELECT TO authenticated
    USING (id = auth.uid());

-- faculty: read own record
DROP POLICY IF EXISTS faculty_select_own ON faculty;
CREATE POLICY faculty_select_own ON faculty
    FOR SELECT TO authenticated
    USING (id = auth.uid());

-- admins: NO authenticated policies (service_role only)
-- (intentionally no policy created)


-- ─── Registration & Preferences ──────────────────────────────────────────────

-- student_registrations: read own registration
DROP POLICY IF EXISTS registrations_select_own ON student_registrations;
CREATE POLICY registrations_select_own ON student_registrations
    FOR SELECT TO authenticated
    USING (student_id = auth.uid());

-- registration_preferences: own SELECT
DROP POLICY IF EXISTS preferences_select_own ON registration_preferences;
CREATE POLICY preferences_select_own ON registration_preferences
    FOR SELECT TO authenticated
    USING (student_id = auth.uid());

-- registration_preferences: own INSERT (with deadline enforcement)
DROP POLICY IF EXISTS preferences_insert_own ON registration_preferences;
CREATE POLICY preferences_insert_own ON registration_preferences
    FOR INSERT TO authenticated
    WITH CHECK (
        student_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM students s
            JOIN campus_settings cs ON cs.campus_id = s.campus_id
            WHERE s.id = auth.uid()
              AND (cs.deadline IS NULL OR cs.deadline > NOW())
        )
    );

-- registration_preferences: own UPDATE (with deadline enforcement)
DROP POLICY IF EXISTS preferences_update_own ON registration_preferences;
CREATE POLICY preferences_update_own ON registration_preferences
    FOR UPDATE TO authenticated
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


-- ─── Teacher Course Assignments ──────────────────────────────────────────────

-- Read: all authenticated (teachers need to see schedules)
DROP POLICY IF EXISTS "Allow read assignments for authenticated users" ON teacher_course_assignments;
CREATE POLICY "Allow read assignments for authenticated users"
    ON teacher_course_assignments FOR SELECT TO authenticated
    USING (true);

-- Write: HODs and Admins only
DROP POLICY IF EXISTS "Allow write assignments for HODs and Admins" ON teacher_course_assignments;
CREATE POLICY "Allow write assignments for HODs and Admins"
    ON teacher_course_assignments FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM faculty WHERE id = auth.uid() AND role = 'hod')
        OR EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM faculty WHERE id = auth.uid() AND role = 'hod')
        OR EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
    );


-- ─── Period Attendance ───────────────────────────────────────────────────────

-- Students: read own attendance
DROP POLICY IF EXISTS period_attendance_select_auth ON period_attendance;
DROP POLICY IF EXISTS "Students can view own period attendance" ON period_attendance;
CREATE POLICY period_attendance_select_auth ON period_attendance
    FOR SELECT TO authenticated
    USING (student_id = auth.uid() OR marked_by = auth.uid());

-- Faculty: scoped ALL (assigned courses, HOD for dept, director, admin)
-- This re-asserts the hardened policy from 20260923_fix_security_findings.sql
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


-- ─── Period Unlock Requests ──────────────────────────────────────────────────

DROP POLICY IF EXISTS "Allow HODs and Admins to manage unlock requests" ON period_unlock_requests;
CREATE POLICY "Allow HODs and Admins to manage unlock requests"
    ON period_unlock_requests FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM faculty WHERE id = auth.uid() AND role = 'hod')
        OR EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM faculty WHERE id = auth.uid() AND role = 'hod')
        OR EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
    );


-- ─── Campus Sign-Ins ─────────────────────────────────────────────────────────

-- Students: read own sign-in history (no INSERT — geofence requires backend)
DROP POLICY IF EXISTS "Students can view own campus sign-in records" ON campus_sign_ins;
CREATE POLICY "Students can view own campus sign-in records"
    ON campus_sign_ins FOR SELECT TO authenticated
    USING (student_id = auth.uid());

-- Student direct INSERT was dropped by 20260923_fix_security_findings.sql
-- Re-enforce: ensure it stays dropped
DROP POLICY IF EXISTS "Students insert own campus sign-ins" ON campus_sign_ins;
DROP POLICY IF EXISTS "Students can insert own campus sign-in records" ON campus_sign_ins;

-- HODs: view department sign-ins
DROP POLICY IF EXISTS "HODs can view department campus sign-in records" ON campus_sign_ins;
CREATE POLICY "HODs can view department campus sign-in records"
    ON campus_sign_ins FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM faculty f
            JOIN students s ON s.department_id = f.department_id
            WHERE f.id = auth.uid()
              AND f.role = 'hod'
              AND s.id = campus_sign_ins.student_id
        )
    );

-- Directors and Admins: full visibility
DROP POLICY IF EXISTS "Admins and Directors can view all campus sign-in records" ON campus_sign_ins;
CREATE POLICY "Admins and Directors can view all campus sign-in records"
    ON campus_sign_ins FOR ALL TO authenticated
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('campus_director', 'superadmin')
        OR (auth.jwt() ->> 'role') IN ('campus_director', 'superadmin')
        OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('campus_director', 'superadmin')
    );


-- ─── Consent Records ────────────────────────────────────────────────────────

-- Re-assert the corrected policies from 20260924_fix_consent_rls_policy.sql
DROP POLICY IF EXISTS consent_select_own ON consent_records;
CREATE POLICY consent_select_own ON consent_records
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS consent_insert_own ON consent_records;
CREATE POLICY consent_insert_own ON consent_records
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());


-- ─── Service-Role-Only Tables: NO authenticated policies ─────────────────────
-- admins, audit_logs, system_logs, timetable_generation_jobs, timetable_conflicts
-- These tables have NO authenticated policies. Only service_role (via NestJS backend)
-- can read/write them. The service_role_all_* policies from 20260922 handle this.
-- (Nothing to create here, just documenting the intent.)


-- =============================================================================
-- PART 3: RESTRICT EXECUTE ON SECURITY DEFINER RPCs
-- Only service_role should be able to call these functions.
-- service_role bypasses PostgreSQL privilege checks, so REVOKE does not affect it.
-- Uses pg_proc dynamically to safely revoke all parameter overloads without failing.
-- =============================================================================
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT p.oid::regprocedure AS func_sig
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
          AND p.proname IN (
              'delete_campus_cascade',
              'delete_department_cascade',
              'promote_campus_students',
              'apply_course_allocation'
          )
    LOOP
        EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM public, anon, authenticated;', r.func_sig);
    END LOOP;
END;
$$;

