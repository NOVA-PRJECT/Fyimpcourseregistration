-- =============================================================================
-- Migration: 20260922_enable_rls_and_core_policies.sql
-- Description: Enable Row Level Security (RLS) across all core database tables
--              and define least-privilege security policies for authenticated users.
-- =============================================================================

-- 1. Enable RLS on core academic and organizational tables
ALTER TABLE IF EXISTS campuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS campus_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS semester_blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS course_prerequisite_rules ENABLE ROW LEVEL SECURITY;

-- 2. Enable RLS on user and profile tables
ALTER TABLE IF EXISTS students ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS faculty ENABLE ROW LEVEL SECURITY;

-- 3. Enable RLS on registration and course allocation tables
ALTER TABLE IF EXISTS registration_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS student_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS teacher_course_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS credit_transfer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS consent_records ENABLE ROW LEVEL SECURITY;

-- 4. Enable RLS on timetable and attendance tables
ALTER TABLE IF EXISTS time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS timetable_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS timetable_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS timetable_generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS period_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS period_unlock_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS campus_attendance ENABLE ROW LEVEL SECURITY;

-- 5. Enable RLS on system and audit logs
ALTER TABLE IF EXISTS audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS system_logs ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- CORE POLICIES FOR SERVICE ROLE
-- (Ensures backend NestJS services using service_role key maintain full access)
-- =============================================================================

DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'campuses', 'departments', 'campus_settings', 'courses',
        'semester_blueprints', 'course_prerequisite_rules', 'students',
        'faculty', 'registration_preferences', 'student_registrations',
        'teacher_course_assignments', 'credit_transfer_requests', 'consent_records',
        'time_slots', 'timetable_slots', 'timetable_entries',
        'timetable_generation_jobs', 'period_attendance', 'period_unlock_requests',
        'campus_attendance', 'audit_logs', 'system_logs'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS service_role_all_%I ON %I;', tbl, tbl);
        EXECUTE format('CREATE POLICY service_role_all_%I ON %I FOR ALL TO service_role USING (true) WITH CHECK (true);', tbl, tbl);
    END LOOP;
END $$;

-- =============================================================================
-- AUTHENTICATED USER READ POLICIES
-- =============================================================================

-- Campuses & Departments: readable by any authenticated user
DROP POLICY IF EXISTS campuses_select_auth ON campuses;
CREATE POLICY campuses_select_auth ON campuses FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS departments_select_auth ON departments;
CREATE POLICY departments_select_auth ON departments FOR SELECT TO authenticated USING (true);

-- Campus Settings: readable by any authenticated user
DROP POLICY IF EXISTS campus_settings_select_auth ON campus_settings;
CREATE POLICY campus_settings_select_auth ON campus_settings FOR SELECT TO authenticated USING (true);

-- Courses: readable by any authenticated user
DROP POLICY IF EXISTS courses_select_auth ON courses;
CREATE POLICY courses_select_auth ON courses FOR SELECT TO authenticated USING (true);

-- Blueprints & Prerequisites: readable by authenticated users
DROP POLICY IF EXISTS blueprints_select_auth ON semester_blueprints;
CREATE POLICY blueprints_select_auth ON semester_blueprints FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS prereq_select_auth ON course_prerequisite_rules;
CREATE POLICY prereq_select_auth ON course_prerequisite_rules FOR SELECT TO authenticated USING (true);

-- Students: a student can read and update their own record
DROP POLICY IF EXISTS students_select_own ON students;
CREATE POLICY students_select_own ON students FOR SELECT TO authenticated 
USING (id = auth.uid());

-- Faculty: a faculty member can read their own record
DROP POLICY IF EXISTS faculty_select_own ON faculty;
CREATE POLICY faculty_select_own ON faculty FOR SELECT TO authenticated 
USING (id = auth.uid());

-- Student Registrations: student can read their own registration
DROP POLICY IF EXISTS registrations_select_own ON student_registrations;
CREATE POLICY registrations_select_own ON student_registrations FOR SELECT TO authenticated 
USING (student_id = auth.uid());

-- Registration Preferences: student can read, insert, update their own preferences
DROP POLICY IF EXISTS preferences_select_own ON registration_preferences;
CREATE POLICY preferences_select_own ON registration_preferences FOR SELECT TO authenticated 
USING (student_id = auth.uid());

DROP POLICY IF EXISTS preferences_insert_own ON registration_preferences;
CREATE POLICY preferences_insert_own ON registration_preferences FOR INSERT TO authenticated 
WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS preferences_update_own ON registration_preferences;
CREATE POLICY preferences_update_own ON registration_preferences FOR UPDATE TO authenticated 
USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

-- Timetable Entries & Slots: readable by all authenticated users
DROP POLICY IF EXISTS timetable_slots_select_auth ON time_slots;
CREATE POLICY timetable_slots_select_auth ON time_slots FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS timetable_entries_select_auth ON timetable_entries;
CREATE POLICY timetable_entries_select_auth ON timetable_entries FOR SELECT TO authenticated USING (true);

-- Period Attendance: student can read their own attendance, teacher can read what they marked
DROP POLICY IF EXISTS period_attendance_select_auth ON period_attendance;
CREATE POLICY period_attendance_select_auth ON period_attendance FOR SELECT TO authenticated 
USING (student_id = auth.uid() OR marked_by = auth.uid());

-- Consent records: student can view and insert their own consent records
DROP POLICY IF EXISTS consent_select_own ON consent_records;
CREATE POLICY consent_select_own ON consent_records FOR SELECT TO authenticated 
USING (student_id = auth.uid());

DROP POLICY IF EXISTS consent_insert_own ON consent_records;
CREATE POLICY consent_insert_own ON consent_records FOR INSERT TO authenticated 
WITH CHECK (student_id = auth.uid());
