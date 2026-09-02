-- =============================================================================
-- FYIMP Course Registration Portal - Unified Master Database Migration
-- Version: 2.0.0 (Consolidated & Version Controlled)
-- Database Engine: PostgreSQL 15+ / Supabase
-- Target Schema: public
-- =============================================================================
-- This is the single, integrated master migration file containing:
--   1. Version Control tracking table (schema_migrations)
--   2. Core Academic & Administrative Entity Tables
--   3. Course Registration & NEP Curricular Blueprint Tables
--   4. Automated AI Timetable Generation & Scheduling System
--   5. Row Level Security (RLS) policies and RBAC security rules
--   6. Performance Indexes across foreign keys and frequent query paths
--   7. Initial Seed Data (Standard Academic Time Slots)
--   8. Version Control Migration History Log
-- =============================================================================

-- =============================================================================
-- STEP 1: EXTENSIONS
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- STEP 2: VERSION CONTROL INFRASTRUCTURE
-- =============================================================================
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE schema_migrations IS 'Tracks applied database schema versions and migration history.';

-- =============================================================================
-- STEP 3: CLEANUP / DROP EXISTING TABLES (Reverse Dependency Order)
-- =============================================================================
DROP TABLE IF EXISTS timetable_generation_jobs CASCADE;
DROP TABLE IF EXISTS timetable_entries CASCADE;
DROP TABLE IF EXISTS timetable_conflicts CASCADE;
DROP TABLE IF EXISTS time_slots CASCADE;
DROP TABLE IF EXISTS student_registrations CASCADE;
DROP TABLE IF EXISTS semester_blueprints CASCADE;
DROP TABLE IF EXISTS registration_windows CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS faculty CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS campus_settings CASCADE;
DROP TABLE IF EXISTS campuses CASCADE;
DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;

-- =============================================================================
-- STEP 4: FOUNDATION & INSTITUTIONAL GOVERNANCE TABLES
-- =============================================================================

-- 1. CAMPUSES TABLE
CREATE TABLE campuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE
);

COMMENT ON TABLE campuses IS 'Physical university campuses and satellite academic centers.';

-- 2. DEPARTMENTS TABLE
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE,
    campus_id UUID NOT NULL REFERENCES campuses(id) ON DELETE CASCADE
);

COMMENT ON TABLE departments IS 'Academic departments affiliated with specific university campuses.';

-- 3. COURSES TABLE
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    semester INTEGER NOT NULL CHECK (semester IN (1, 2, 3, 4, 5, 6, 7, 8)),
    credits INTEGER NOT NULL CHECK (credits > 0),
    category TEXT NOT NULL CHECK (category IN ('DSC', 'MDC', 'VAC', 'AEC')),
    tag TEXT,
    theory_hours_per_week SMALLINT NOT NULL DEFAULT 0,
    practical_hours_per_week SMALLINT NOT NULL DEFAULT 0
);

COMMENT ON TABLE courses IS 'Master catalog of academic papers, credit weights, and contact hours.';

-- 4. ADMINS TABLE
CREATE TABLE admins (
    id UUID PRIMARY KEY NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'superadmin' CHECK (role IN ('superadmin', 'admin'))
);

COMMENT ON TABLE admins IS 'System administrators with multi-campus superadmin access privileges.';

-- 5. FACULTY TABLE
CREATE TABLE faculty (
    id UUID PRIMARY KEY NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('hod', 'teaching_staff', 'campus_director')),
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    campus_id UUID NOT NULL REFERENCES campuses(id) ON DELETE CASCADE
);

COMMENT ON TABLE faculty IS 'Academic personnel: Campus Directors, Department Heads, and Teaching Faculty.';

-- 6. CAMPUS_SETTINGS TABLE
CREATE TABLE campus_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campus_id UUID NOT NULL UNIQUE REFERENCES campuses(id) ON DELETE CASCADE,
    deadline TIMESTAMP WITH TIME ZONE,
    academic_year TEXT NOT NULL,
    min_credits INTEGER NOT NULL DEFAULT 18,
    max_credits INTEGER NOT NULL DEFAULT 26,
    last_promoted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE campus_settings IS 'Campus-level academic governance, credit constraints, and term deadlines.';

-- 7. STUDENTS TABLE
CREATE TABLE students (
    id UUID PRIMARY KEY NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    campus_id UUID NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
    current_semester INTEGER NOT NULL DEFAULT 1 CHECK (current_semester >= 1 AND current_semester <= 10),
    cap_application_number TEXT NOT NULL UNIQUE,
    academic_year_joined TEXT NOT NULL,
    must_change_password BOOLEAN NOT NULL DEFAULT true
);

COMMENT ON TABLE students IS 'Enrolled university students with program and semester progression tracking.';

-- =============================================================================
-- STEP 5: REGISTRATION & BLUEPRINT TABLES
-- =============================================================================

-- 8. REGISTRATION_WINDOWS TABLE
CREATE TABLE registration_windows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year TEXT NOT NULL,
    semester SMALLINT NOT NULL,
    campus_id UUID REFERENCES campuses(id) ON DELETE CASCADE,
    is_closed BOOLEAN NOT NULL DEFAULT false,
    closed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(academic_year, semester)
);

COMMENT ON TABLE registration_windows IS 'Lifecycle windows controlling student registration availability.';

-- 9. SEMESTER_BLUEPRINTS TABLE
CREATE TABLE semester_blueprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    semester INTEGER NOT NULL CHECK (semester IN (1, 2, 3, 4, 5, 6, 7, 8)),
    min_credits INTEGER NOT NULL DEFAULT 18,
    max_credits INTEGER NOT NULL DEFAULT 26,
    slot_1_rule TEXT,
    slot_1_target TEXT,
    slot_2_rule TEXT,
    slot_2_target TEXT,
    slot_3_rule TEXT,
    slot_3_target TEXT,
    slot_4_rule TEXT,
    slot_4_target TEXT,
    slot_5_rule TEXT,
    slot_5_target TEXT,
    slot_6_rule TEXT,
    slot_6_target TEXT,
    slot_1_name TEXT,
    slot_2_name TEXT,
    slot_3_name TEXT,
    slot_4_name TEXT,
    slot_5_name TEXT,
    slot_6_name TEXT,
    pathways JSONB,
    UNIQUE(department_id, semester)
);

COMMENT ON TABLE semester_blueprints IS 'Department curricular frameworks defining slot rules, credit bounds, and pathways.';

-- 10. STUDENT_REGISTRATIONS TABLE
CREATE TABLE student_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    campus_id UUID NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
    semester INTEGER NOT NULL CHECK (semester IN (1, 2, 3, 4, 5, 6, 7, 8)),
    academic_year TEXT NOT NULL,
    slot_1_course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    slot_2_course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    slot_3_course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    slot_4_course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    slot_5_course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    slot_6_course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    total_credits INTEGER NOT NULL CHECK (total_credits >= 0),
    submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    pathway_id TEXT,
    selections JSONB,
    UNIQUE(student_id, semester, academic_year)
);

COMMENT ON TABLE student_registrations IS 'Student semester course selections, pathway choices, and credit totals.';

-- =============================================================================
-- STEP 6: TIMETABLE & SCHEDULING TABLES
-- =============================================================================

-- 11. TIME_SLOTS TABLE
CREATE TABLE time_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day_of_week SMALLINT NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 6),
    period_number SMALLINT NOT NULL CHECK (period_number >= 1 AND period_number <= 10),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_lab_block BOOLEAN NOT NULL DEFAULT false,
    lab_pair_with UUID REFERENCES time_slots(id) ON DELETE SET NULL,
    UNIQUE(day_of_week, period_number)
);

COMMENT ON TABLE time_slots IS 'Master schedule grid periods across academic weekdays.';

-- 12. TIMETABLE_CONFLICTS TABLE
CREATE TABLE timetable_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year TEXT NOT NULL,
    semester SMALLINT NOT NULL,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    blocking_course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    conflicting_student_count INTEGER,
    resolved BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMENT ON TABLE timetable_conflicts IS 'Audit log of scheduling conflicts and unsolvable student overlaps.';

-- 13. TIMETABLE_ENTRIES TABLE
CREATE TABLE timetable_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year TEXT NOT NULL,
    semester SMALLINT NOT NULL,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    time_slot_id UUID NOT NULL REFERENCES time_slots(id) ON DELETE CASCADE,
    is_lab_block BOOLEAN NOT NULL DEFAULT false,
    session_type TEXT NOT NULL DEFAULT 'theory' CHECK (session_type IN ('theory', 'practical')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'published', 'conflict')),
    generated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    generated_at TIMESTAMP WITH TIME ZONE,
    published_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT timetable_entries_unique UNIQUE (academic_year, semester, course_id, time_slot_id, department_id)
);

COMMENT ON TABLE timetable_entries IS 'Weekly scheduled time slot allocations for courses by department.';

-- 14. TIMETABLE_GENERATION_JOBS TABLE
CREATE TABLE timetable_generation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year TEXT NOT NULL,
    semester SMALLINT NOT NULL,
    campus_id UUID REFERENCES campuses(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed')),
    progress SMALLINT DEFAULT 0,
    error_message TEXT,
    triggered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMENT ON TABLE timetable_generation_jobs IS 'Asynchronous background state for automated AI timetable scheduling jobs.';

-- =============================================================================
-- STEP 7: AUDIT LOGS
-- =============================================================================

-- 15. AUDIT_LOGS TABLE
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    user_id UUID,
    user_role TEXT NOT NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    status TEXT NOT NULL,
    error_message TEXT,
    metadata JSONB,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMENT ON TABLE audit_logs IS 'System audit trail for security events, administrative updates, and submissions.';

-- =============================================================================
-- STEP 8: PERFORMANCE INDEXES
-- =============================================================================
CREATE INDEX idx_departments_campus_id ON departments(campus_id);
CREATE INDEX idx_courses_department_id ON courses(department_id);
CREATE INDEX idx_courses_semester ON courses(semester);
CREATE INDEX idx_courses_category ON courses(category);
CREATE INDEX idx_faculty_campus_id ON faculty(campus_id);
CREATE INDEX idx_faculty_department_id ON faculty(department_id);
CREATE INDEX idx_faculty_role ON faculty(role);
CREATE INDEX idx_campus_settings_campus_id ON campus_settings(campus_id);
CREATE INDEX idx_students_department_id ON students(department_id);
CREATE INDEX idx_students_campus_id ON students(campus_id);
CREATE INDEX idx_student_registrations_student_id ON student_registrations(student_id);
CREATE INDEX idx_student_registrations_campus_id ON student_registrations(campus_id);
CREATE INDEX idx_student_registrations_course_slots ON student_registrations(slot_1_course_id, slot_2_course_id, slot_3_course_id);
CREATE INDEX idx_timetable_entries_course_id ON timetable_entries(course_id);
CREATE INDEX idx_timetable_entries_department_id ON timetable_entries(department_id);
CREATE INDEX idx_timetable_entries_time_slot_id ON timetable_entries(time_slot_id);
CREATE INDEX idx_timetable_entries_status ON timetable_entries(status);
CREATE INDEX idx_timetable_conflicts_course_id ON timetable_conflicts(course_id);
CREATE INDEX idx_timetable_conflicts_academic_year ON timetable_conflicts(academic_year, semester);
CREATE INDEX idx_registration_windows_academic_year ON registration_windows(academic_year, semester);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);

-- =============================================================================
-- STEP 9: ROW LEVEL SECURITY (RLS) & POLICIES
-- =============================================================================
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_windows ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- 1. Time slots: Read for all authenticated
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'time_slots' AND policyname = 'Allow read access to time_slots for authenticated users') THEN
    CREATE POLICY "Allow read access to time_slots for authenticated users"
      ON time_slots FOR SELECT TO authenticated USING (true);
  END IF;

  -- 2. Timetable entries: Read for all authenticated
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'timetable_entries' AND policyname = 'Allow read access to timetable_entries for authenticated users') THEN
    CREATE POLICY "Allow read access to timetable_entries for authenticated users"
      ON timetable_entries FOR SELECT TO authenticated USING (true);
  END IF;

  -- Timetable entries: Write for directors & superadmins
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'timetable_entries' AND policyname = 'Allow write access to timetable_entries for directors and superadmins') THEN
    CREATE POLICY "Allow write access to timetable_entries for directors and superadmins"
      ON timetable_entries FOR ALL TO authenticated
      USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('campus_director', 'superadmin')
        OR (auth.jwt() ->> 'role') IN ('campus_director', 'superadmin')
        OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('campus_director', 'superadmin')
      );
  END IF;

  -- 3. Generation jobs: Read for authenticated
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'timetable_generation_jobs' AND policyname = 'Allow read access to timetable_generation_jobs for authenticated users') THEN
    CREATE POLICY "Allow read access to timetable_generation_jobs for authenticated users"
      ON timetable_generation_jobs FOR SELECT TO authenticated USING (true);
  END IF;

  -- Generation jobs: Write for directors & superadmins
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'timetable_generation_jobs' AND policyname = 'Allow write access to timetable_generation_jobs for directors and superadmins') THEN
    CREATE POLICY "Allow write access to timetable_generation_jobs for directors and superadmins"
      ON timetable_generation_jobs FOR ALL TO authenticated
      USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('campus_director', 'superadmin')
        OR (auth.jwt() ->> 'role') IN ('campus_director', 'superadmin')
        OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('campus_director', 'superadmin')
      );
  END IF;

  -- 4. Conflicts: Read for authenticated
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'timetable_conflicts' AND policyname = 'Allow read access to timetable_conflicts for authenticated users') THEN
    CREATE POLICY "Allow read access to timetable_conflicts for authenticated users"
      ON timetable_conflicts FOR SELECT TO authenticated USING (true);
  END IF;

  -- Conflicts: Write for directors & superadmins
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'timetable_conflicts' AND policyname = 'Allow write access to timetable_conflicts for directors and superadmins') THEN
    CREATE POLICY "Allow write access to timetable_conflicts for directors and superadmins"
      ON timetable_conflicts FOR ALL TO authenticated
      USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('campus_director', 'superadmin')
        OR (auth.jwt() ->> 'role') IN ('campus_director', 'superadmin')
        OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('campus_director', 'superadmin')
      );
  END IF;

  -- 5. Registration windows: Read for authenticated
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'registration_windows' AND policyname = 'Allow read access to registration_windows for authenticated users') THEN
    CREATE POLICY "Allow read access to registration_windows for authenticated users"
      ON registration_windows FOR SELECT TO authenticated USING (true);
  END IF;

  -- Registration windows: Write for directors & superadmins
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'registration_windows' AND policyname = 'Allow write access to registration_windows for directors and superadmins') THEN
    CREATE POLICY "Allow write access to registration_windows for directors and superadmins"
      ON registration_windows FOR ALL TO authenticated
      USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('campus_director', 'superadmin')
        OR (auth.jwt() ->> 'role') IN ('campus_director', 'superadmin')
        OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('campus_director', 'superadmin')
      );
  END IF;
END $$;

-- =============================================================================
-- STEP 10: INITIAL SEED DATA (Academic Time Slots)
-- =============================================================================
DO $$
DECLARE
  days int[] := ARRAY[1,2,3,4,5]; -- Monday through Friday
  d int;
BEGIN
  FOREACH d IN ARRAY days LOOP
    INSERT INTO time_slots (day_of_week, period_number, start_time, end_time)
    VALUES
      (d, 1, '09:30', '10:30'),
      (d, 2, '10:30', '11:30'),
      (d, 3, '11:30', '12:30'),
      (d, 4, '13:30', '14:30'),
      (d, 5, '14:30', '15:30'),
      (d, 6, '15:30', '16:30')
    ON CONFLICT (day_of_week, period_number) DO NOTHING;
  END LOOP;
END $$;

-- =============================================================================
-- STEP 11: VERSION CONTROL LOG (Audit & Applied Migrations Record)
-- =============================================================================
INSERT INTO schema_migrations (version, name, description)
VALUES
  ('20260801000000', 'initial_fyimp_core_schema', 'Initial foundation tables: campuses, departments, courses, faculty, students, blueprints, registrations, audit logs'),
  ('20260814000000', 'timetable_generation_system', 'Timetable management tables: time_slots, timetable_entries, conflicts, generation jobs, and RLS policies'),
  ('20260819000000', 'timetable_cross_dept_unique', 'Updated timetable_entries_unique constraint to include department_id for multi-department parallel coursing'),
  ('20260820000000', 'timetable_theory_practical_hours', 'Added theory_hours_per_week, practical_hours_per_week, and session_type categorization'),
  ('20260902000000', 'master_unified_schema_v2', 'Unified all historical migrations into a single, idempotent, version-controlled master SQL schema')
ON CONFLICT (version) DO UPDATE 
SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  applied_at = timezone('utc'::text, now());

-- =============================================================================
-- END OF UNIFIED MIGRATION FILE
-- Total Tables: 16 (including schema_migrations)
-- =============================================================================
