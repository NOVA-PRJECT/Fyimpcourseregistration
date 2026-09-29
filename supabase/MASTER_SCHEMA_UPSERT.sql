-- =============================================================================
-- FYIMP Course Registration & Campus Attendance Portal
-- UNIFIED MASTER DATABASE SCHEMA & SEED UPSERT SCRIPT
-- Version: 4.0.0 (Unified Idempotent Master Migration)
-- Target Schema: PostgreSQL 15+ / Supabase (public)
--
-- Safe for execution on:
--   1. A brand new Supabase project
--   2. An existing database with older/partial schemas
--   3. Production databases (Idempotent: preserves all existing user/auth data)
-- =============================================================================

-- =============================================================================
-- PART 1: EXTENSIONS
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- PART 2: IDEMPOTENT TABLE PROVISIONING (CREATE TABLE IF NOT EXISTS)
-- =============================================================================

-- 1. Campuses
CREATE TABLE IF NOT EXISTS campuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE,
    center_latitude NUMERIC,
    center_longitude NUMERIC,
    radius_meters INTEGER NOT NULL DEFAULT 500,
    morning_cutoff_time TIME NOT NULL DEFAULT '09:30:00',
    midday_split_time TIME NOT NULL DEFAULT '13:30:00',
    evening_cutoff_time TIME NOT NULL DEFAULT '15:30:00',
    day_end_time TIME NOT NULL DEFAULT '17:00:00',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
COMMENT ON TABLE campuses IS 'Physical university campuses and satellite academic centers.';

-- 2. Campus Settings (Registration window, credits, promotion timestamp)
CREATE TABLE IF NOT EXISTS campus_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campus_id UUID NOT NULL UNIQUE REFERENCES campuses(id) ON DELETE CASCADE,
    academic_year TEXT NOT NULL DEFAULT '2026-27',
    min_credits INTEGER NOT NULL DEFAULT 18,
    max_credits INTEGER NOT NULL DEFAULT 26,
    deadline TIMESTAMPTZ,
    last_promoted_at TIMESTAMPTZ
);
COMMENT ON TABLE campus_settings IS 'Campus-level academic governance, credit constraints, and term deadlines.';

-- 3. Departments
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE,
    campus_id UUID NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
COMMENT ON TABLE departments IS 'Academic departments affiliated with specific university campuses.';

-- 4. Courses
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    semester INTEGER NOT NULL CHECK (semester BETWEEN 1 AND 10),
    credits INTEGER NOT NULL CHECK (credits > 0),
    category TEXT NOT NULL CHECK (category IN ('DSS', 'DSC', 'DSE', 'VAC', 'SEC', 'MDC', 'MOOC', 'AEC', 'INT', 'FWD', 'RPH', 'CIP')),
    tag TEXT,
    theory_hours_per_week SMALLINT NOT NULL DEFAULT 0,
    practical_hours_per_week SMALLINT NOT NULL DEFAULT 0,
    seat_limit INTEGER NOT NULL DEFAULT 60,
    prerequisite_course_ids UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
COMMENT ON TABLE courses IS 'Master catalog of academic courses, credit values, contact hours, and seat limits.';

-- 5. Course Prerequisite Rules (V2 Multi-Round Allocation Scoring)
CREATE TABLE IF NOT EXISTS course_prerequisite_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    rule TEXT NOT NULL CHECK (rule IN ('COMPLETED_COURSE', 'COMPLETED_SEMESTER', 'DEPARTMENT')),
    target TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_course_rule_target UNIQUE(course_id, rule, target)
);
COMMENT ON TABLE course_prerequisite_rules IS 'Scoring rules evaluated during multi-round course allocation.';

-- 6. Admins
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'superadmin' CHECK (role IN ('superadmin', 'admin')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Faculty
CREATE TABLE IF NOT EXISTS faculty (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('hod', 'teaching_staff', 'campus_director', 'teacher')),
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    campus_id UUID NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Students
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    campus_id UUID NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
    current_semester INTEGER NOT NULL DEFAULT 1 CHECK (current_semester BETWEEN 1 AND 10),
    cap_application_number TEXT NOT NULL UNIQUE,
    academic_year_joined TEXT NOT NULL,
    must_change_password BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Semester Blueprints
CREATE TABLE IF NOT EXISTS semester_blueprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    semester INTEGER NOT NULL CHECK (semester BETWEEN 1 AND 8),
    min_credits INTEGER NOT NULL DEFAULT 18,
    max_credits INTEGER NOT NULL DEFAULT 26,
    slot_1_name TEXT,
    slot_1_rule TEXT,
    slot_1_target TEXT,
    slot_2_name TEXT,
    slot_2_rule TEXT,
    slot_2_target TEXT,
    slot_3_name TEXT,
    slot_3_rule TEXT,
    slot_3_target TEXT,
    slot_4_name TEXT,
    slot_4_rule TEXT,
    slot_4_target TEXT,
    slot_5_name TEXT,
    slot_5_rule TEXT,
    slot_5_target TEXT,
    slot_6_name TEXT,
    slot_6_rule TEXT,
    slot_6_target TEXT,
    pathways JSONB,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(department_id, semester)
);

-- 10. Registration Preferences
CREATE TABLE IF NOT EXISTS registration_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    campus_id UUID NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
    semester SMALLINT NOT NULL,
    academic_year TEXT NOT NULL,
    pathway_id TEXT,
    preferences JSONB NOT NULL DEFAULT '[]'::jsonb,
    allocation_metadata JSONB DEFAULT '{}'::jsonb,
    submitted_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_student_pref UNIQUE(student_id, semester, academic_year)
);

-- 11. Student Registrations
CREATE TABLE IF NOT EXISTS student_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    campus_id UUID NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
    semester INTEGER NOT NULL CHECK (semester BETWEEN 1 AND 8),
    academic_year TEXT NOT NULL,
    slot_1_course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    slot_2_course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    slot_3_course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    slot_4_course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    slot_5_course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    slot_6_course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    total_credits INTEGER NOT NULL DEFAULT 0 CHECK (total_credits >= 0),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    pathway_id TEXT,
    selections JSONB,
    selected_courses JSONB,
    allocation_metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(student_id, semester, academic_year)
);

-- 12. Time Slots
CREATE TABLE IF NOT EXISTS time_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 6),
    period_number SMALLINT NOT NULL CHECK (period_number BETWEEN 1 AND 10),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_lab_block BOOLEAN NOT NULL DEFAULT false,
    lab_pair_with UUID REFERENCES time_slots(id) ON DELETE SET NULL,
    UNIQUE(day_of_week, period_number)
);

-- 13. Timetable Entries
CREATE TABLE IF NOT EXISTS timetable_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year TEXT NOT NULL,
    semester SMALLINT NOT NULL,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    time_slot_id UUID NOT NULL REFERENCES time_slots(id) ON DELETE CASCADE,
    is_lab_block BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'published')),
    session_type TEXT DEFAULT 'theory',
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(department_id, time_slot_id, academic_year, semester)
);

-- 14. Timetable Conflicts
CREATE TABLE IF NOT EXISTS timetable_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year TEXT NOT NULL,
    semester SMALLINT NOT NULL,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    blocking_course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    conflicting_student_count INTEGER DEFAULT 0,
    resolved BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 15. Teacher Course Assignments
CREATE TABLE IF NOT EXISTS teacher_course_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES faculty(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES faculty(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    academic_year TEXT,
    semester SMALLINT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT teacher_course_assignments_unique UNIQUE(teacher_id, course_id)
);

-- 16. Period Attendance (Timetable Entry based)
CREATE TABLE IF NOT EXISTS period_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timetable_slot_id UUID NOT NULL REFERENCES timetable_entries(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    marked_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent')),
    marked_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_late_entry BOOLEAN NOT NULL DEFAULT false,
    unlocked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    CONSTRAINT period_attendance_unique UNIQUE (timetable_slot_id, student_id, attendance_date)
);

-- 17. Period Unlock Requests
CREATE TABLE IF NOT EXISTS period_unlock_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timetable_slot_id UUID NOT NULL REFERENCES timetable_entries(id) ON DELETE CASCADE,
    unlocked_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 18. Campus Sign-Ins (Zero coordinate retention GPS attendance)
CREATE TABLE IF NOT EXISTS campus_sign_ins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    campus_id UUID NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
    session_type TEXT NOT NULL CHECK (session_type IN ('morning', 'evening')),
    signed_in_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    signed_in_date DATE NOT NULL DEFAULT ((timezone('utc'::text, now()) AT TIME ZONE 'Asia/Kolkata')::date),
    location_accuracy_meters NUMERIC NOT NULL DEFAULT 10,
    status TEXT NOT NULL CHECK (status IN ('on_time', 'late', 'early_leave')),
    source TEXT NOT NULL DEFAULT 'gps' CHECK (source IN ('gps', 'manual_staff')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT campus_sign_ins_unique UNIQUE (student_id, campus_id, signed_in_date, session_type)
);

-- 19. Consent Records
CREATE TABLE IF NOT EXISTS consent_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    policy_version TEXT NOT NULL DEFAULT 'v1.0',
    accepted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, policy_version)
);

-- 20. System Logs (Consolidated Audit & Background Jobs)
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_type TEXT NOT NULL CHECK (log_type IN ('audit_event', 'timetable_job', 'allocation_run', 'server_error')),
    status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed', 'success', 'failure')),
    progress SMALLINT DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    error_message TEXT,
    error_stack TEXT,
    campus_id UUID REFERENCES campuses(id) ON DELETE CASCADE,
    academic_year TEXT,
    semester SMALLINT,
    user_id UUID,
    user_role TEXT,
    event_type TEXT,
    action TEXT,
    resource_type TEXT,
    resource_id UUID,
    ip_address INET,
    user_agent TEXT,
    route TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 21. Schema Migrations Audit Table
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    applied_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =============================================================================
-- PART 3: INCREMENTAL COLUMN UPGRADES & OBSOLETE CLEANUP (IDEMPOTENT)
-- =============================================================================

-- Ensure campuses geofence fields
ALTER TABLE campuses ADD COLUMN IF NOT EXISTS center_latitude NUMERIC;
ALTER TABLE campuses ADD COLUMN IF NOT EXISTS center_longitude NUMERIC;
ALTER TABLE campuses ADD COLUMN IF NOT EXISTS radius_meters INTEGER NOT NULL DEFAULT 500;
ALTER TABLE campuses ADD COLUMN IF NOT EXISTS morning_cutoff_time TIME NOT NULL DEFAULT '09:30:00';
ALTER TABLE campuses ADD COLUMN IF NOT EXISTS midday_split_time TIME NOT NULL DEFAULT '13:30:00';
ALTER TABLE campuses ADD COLUMN IF NOT EXISTS evening_cutoff_time TIME NOT NULL DEFAULT '15:30:00';
ALTER TABLE campuses ADD COLUMN IF NOT EXISTS day_end_time TIME NOT NULL DEFAULT '17:00:00';

-- Ensure campus_settings fields
ALTER TABLE campus_settings ADD COLUMN IF NOT EXISTS academic_year TEXT NOT NULL DEFAULT '2026-27';
ALTER TABLE campus_settings ADD COLUMN IF NOT EXISTS min_credits INTEGER NOT NULL DEFAULT 18;
ALTER TABLE campus_settings ADD COLUMN IF NOT EXISTS max_credits INTEGER NOT NULL DEFAULT 26;
ALTER TABLE campus_settings ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ;
ALTER TABLE campus_settings ADD COLUMN IF NOT EXISTS last_promoted_at TIMESTAMPTZ;

-- Ensure courses fields & retire obsolete columns
ALTER TABLE courses ADD COLUMN IF NOT EXISTS theory_hours_per_week SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS practical_hours_per_week SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS seat_limit INTEGER NOT NULL DEFAULT 60;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS prerequisite_course_ids UUID[] DEFAULT '{}';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS tag TEXT;
ALTER TABLE courses DROP COLUMN IF EXISTS allowed_department_ids;

-- Ensure registration_preferences & student_registrations columns
ALTER TABLE registration_preferences ADD COLUMN IF NOT EXISTS pathway_id TEXT;
ALTER TABLE registration_preferences ALTER COLUMN pathway_id TYPE TEXT;
ALTER TABLE registration_preferences ADD COLUMN IF NOT EXISTS allocation_metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE registration_preferences ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE student_registrations ADD COLUMN IF NOT EXISTS pathway_id TEXT;
ALTER TABLE student_registrations ADD COLUMN IF NOT EXISTS selections JSONB;
ALTER TABLE student_registrations ADD COLUMN IF NOT EXISTS selected_courses JSONB;
ALTER TABLE student_registrations ADD COLUMN IF NOT EXISTS allocation_metadata JSONB DEFAULT '{}'::jsonb;

-- Relax total_credits constraint to support multi-phase / elective-only credit states
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = 'public' 
          AND table_name = 'student_registrations'
          AND constraint_name = 'student_registrations_total_credits_check'
    ) THEN
        ALTER TABLE student_registrations DROP CONSTRAINT student_registrations_total_credits_check;
    END IF;
    ALTER TABLE student_registrations ADD CONSTRAINT student_registrations_total_credits_check CHECK (total_credits >= 0);
END $$;

-- Ensure timetable_entries fields
ALTER TABLE timetable_entries ADD COLUMN IF NOT EXISTS session_type TEXT DEFAULT 'theory';
ALTER TABLE timetable_entries ADD COLUMN IF NOT EXISTS is_lab_block BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE timetable_entries ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- Ensure period_attendance & period_unlock_requests structure
DO $$
BEGIN
    -- If period_attendance has old schema (lacking timetable_slot_id), rebuild table safely
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'period_attendance'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'period_attendance' AND column_name = 'timetable_slot_id'
    ) THEN
        DROP TABLE period_attendance CASCADE;
        CREATE TABLE period_attendance (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            timetable_slot_id UUID NOT NULL REFERENCES timetable_entries(id) ON DELETE CASCADE,
            student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
            course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
            marked_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            status TEXT NOT NULL CHECK (status IN ('present', 'absent')),
            marked_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
            attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
            is_late_entry BOOLEAN NOT NULL DEFAULT false,
            unlocked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
            CONSTRAINT period_attendance_unique UNIQUE (timetable_slot_id, student_id, attendance_date)
        );
    ELSE
        ALTER TABLE period_attendance ADD COLUMN IF NOT EXISTS attendance_date DATE NOT NULL DEFAULT CURRENT_DATE;
        ALTER TABLE period_attendance ADD COLUMN IF NOT EXISTS is_late_entry BOOLEAN NOT NULL DEFAULT false;
        ALTER TABLE period_attendance ADD COLUMN IF NOT EXISTS unlocked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;

    -- If period_unlock_requests has old schema, rebuild safely
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'period_unlock_requests'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'period_unlock_requests' AND column_name = 'timetable_slot_id'
    ) THEN
        DROP TABLE period_unlock_requests CASCADE;
        CREATE TABLE period_unlock_requests (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            timetable_slot_id UUID NOT NULL REFERENCES timetable_entries(id) ON DELETE CASCADE,
            unlocked_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            unlocked_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
            reason TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
        );
    END IF;
END $$;

-- Drop redundant legacy registration_windows table if present
DROP TABLE IF EXISTS public.registration_windows CASCADE;

-- =============================================================================
-- PART 4: CONSTRAINT HARMONIZATION & POSTGREST FOREIGN KEYS
-- =============================================================================

-- Expand course category check to all 12 FYIMP categories
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_category_check;
ALTER TABLE courses ADD CONSTRAINT courses_category_check
    CHECK (category IN ('DSS', 'DSC', 'DSE', 'VAC', 'SEC', 'MDC', 'MOOC', 'AEC', 'INT', 'FWD', 'RPH', 'CIP'));

-- Expand course semester check to 1..10
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_semester_check;
ALTER TABLE courses ADD CONSTRAINT courses_semester_check
    CHECK (semester BETWEEN 1 AND 10);

-- Ensure faculty role check includes teacher
ALTER TABLE faculty DROP CONSTRAINT IF EXISTS faculty_role_check;
ALTER TABLE faculty ADD CONSTRAINT faculty_role_check
    CHECK (role IN ('hod', 'campus_director', 'teaching_staff', 'teacher'));

-- Ensure period_attendance unique constraint with attendance_date
ALTER TABLE period_attendance DROP CONSTRAINT IF EXISTS period_attendance_unique;
ALTER TABLE period_attendance ADD CONSTRAINT period_attendance_unique 
    UNIQUE (timetable_slot_id, student_id, attendance_date);

-- Ensure student_registrations_total_credits_check allows in-progress and partial allocations
ALTER TABLE student_registrations DROP CONSTRAINT IF EXISTS student_registrations_total_credits_check;
ALTER TABLE student_registrations ADD CONSTRAINT student_registrations_total_credits_check
    CHECK (total_credits >= 0);

-- Ensure foreign keys from registration tables to students table for PostgREST joins
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_student_registrations_students'
    ) THEN
        ALTER TABLE student_registrations 
        ADD CONSTRAINT fk_student_registrations_students 
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_registration_preferences_students'
    ) THEN
        ALTER TABLE registration_preferences 
        ADD CONSTRAINT fk_registration_preferences_students 
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
    END IF;
END;
$$;

-- =============================================================================
-- PART 5: UNIFIED LOGGING COMPATIBILITY VIEWS & INSTEAD OF TRIGGERS
-- =============================================================================

-- Idempotent cleanup: drop legacy objects whether they are VIEWs or BASE TABLEs.
-- On older databases the 20260908 migration renamed the original tables to *_legacy
-- (BASE TABLEs), so a plain DROP VIEW would fail with error 42809.
DO $$
DECLARE
    obj  text;
    otype text;
    -- Order matters: drop *_legacy wrappers first, then the main compatibility objects
    objs text[] := ARRAY[
        'allocation_runs_legacy', 'allocation_runs',
        'timetable_generation_jobs_legacy', 'timetable_generation_jobs',
        'audit_logs_legacy', 'audit_logs'
    ];
BEGIN
    FOREACH obj IN ARRAY objs LOOP
        -- Check for a VIEW first
        IF EXISTS (
            SELECT 1 FROM information_schema.views
            WHERE table_schema = 'public' AND table_name = obj
        ) THEN
            EXECUTE format('DROP VIEW IF EXISTS public.%I CASCADE;', obj);
        END IF;

        -- Check for a BASE TABLE (legacy renamed tables)
        IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = obj AND table_type = 'BASE TABLE'
        ) THEN
            -- Salvage any residual data from legacy base tables into system_logs
            IF obj = 'allocation_runs' OR obj = 'allocation_runs_legacy' THEN
                BEGIN
                    INSERT INTO system_logs (
                        id, log_type, academic_year, semester, campus_id, user_id,
                        status, started_at, completed_at, error_message, created_at, updated_at
                    )
                    SELECT
                        id, 'allocation_run', academic_year, semester, campus_id, triggered_by,
                        status, triggered_at, completed_at, error_message,
                        triggered_at, COALESCE(completed_at, triggered_at)
                    FROM public.allocation_runs_legacy  -- use EXECUTE below instead
                    ON CONFLICT (id) DO NOTHING;
                EXCEPTION WHEN OTHERS THEN
                    -- Column mismatch or table doesn't match expected shape — skip
                    NULL;
                END;
            END IF;

            IF obj = 'timetable_generation_jobs' OR obj = 'timetable_generation_jobs_legacy' THEN
                BEGIN
                    EXECUTE format(
                        'INSERT INTO system_logs (id, log_type, academic_year, semester, campus_id, user_id, status, progress, error_message, started_at, completed_at, created_at, updated_at)
                         SELECT id, ''timetable_job'', academic_year, semester, campus_id, triggered_by, status, progress, error_message, started_at, completed_at, created_at, updated_at
                         FROM public.%I ON CONFLICT (id) DO NOTHING', obj);
                EXCEPTION WHEN OTHERS THEN NULL;
                END;
            END IF;

            IF obj = 'audit_logs' OR obj = 'audit_logs_legacy' THEN
                BEGIN
                    EXECUTE format(
                        'INSERT INTO system_logs (id, log_type, event_type, user_id, user_role, action, resource_type, resource_id, status, error_message, metadata, ip_address, created_at, updated_at)
                         SELECT id, ''audit_event'', event_type, user_id, user_role, action, resource_type, resource_id, status, error_message, metadata, ip_address, created_at, created_at
                         FROM public.%I ON CONFLICT (id) DO NOTHING', obj);
                EXCEPTION WHEN OTHERS THEN NULL;
                END;
            END IF;

            EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE;', obj);
        END IF;
    END LOOP;
END $$;

-- 1. Allocation Runs View
CREATE OR REPLACE VIEW allocation_runs AS
SELECT 
    id, campus_id, academic_year, semester, status,
    user_id AS triggered_by,
    started_at AS triggered_at,
    COALESCE((metadata->>'total_students')::int, 0) AS total_students,
    COALESCE((metadata->>'fully_allocated')::int, 0) AS fully_allocated,
    COALESCE((metadata->>'partially_allocated')::int, 0) AS partially_allocated,
    COALESCE((metadata->>'unallocated')::int, 0) AS unallocated,
    COALESCE(metadata->'summary', '{}'::jsonb) AS summary,
    error_message, started_at, completed_at, created_at
FROM system_logs WHERE log_type = 'allocation_run';

CREATE OR REPLACE VIEW allocation_runs_legacy AS SELECT * FROM allocation_runs;

-- 2. Timetable Generation Jobs View
CREATE OR REPLACE VIEW timetable_generation_jobs AS
SELECT 
    id, campus_id, academic_year, semester, status, progress, error_message,
    user_id AS triggered_by,
    COALESCE(metadata->'config', '{}'::jsonb) AS config,
    started_at, completed_at, created_at, updated_at
FROM system_logs WHERE log_type = 'timetable_job';

CREATE OR REPLACE VIEW timetable_generation_jobs_legacy AS SELECT * FROM timetable_generation_jobs;

-- 3. Audit Logs View
CREATE OR REPLACE VIEW audit_logs AS
SELECT 
    id, event_type, user_id, user_role, action, resource_type, resource_id,
    status, error_message, metadata, ip_address, user_agent, created_at
FROM system_logs WHERE log_type = 'audit_event';

CREATE OR REPLACE VIEW audit_logs_legacy AS SELECT * FROM audit_logs;

-- Triggers for Allocation Runs View
CREATE OR REPLACE FUNCTION trg_allocation_runs_io()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO system_logs (
            id, log_type, campus_id, academic_year, semester, status, user_id,
            error_message, metadata, started_at, completed_at, created_at, updated_at
        ) VALUES (
            COALESCE(NEW.id, gen_random_uuid()),
            'allocation_run', NEW.campus_id, NEW.academic_year, NEW.semester, NEW.status,
            COALESCE(NEW.triggered_by, auth.uid()),
            NEW.error_message,
            jsonb_build_object(
                'total_students', NEW.total_students,
                'fully_allocated', NEW.fully_allocated,
                'partially_allocated', NEW.partially_allocated,
                'unallocated', NEW.unallocated,
                'summary', NEW.summary
            ),
            COALESCE(NEW.started_at, clock_timestamp()), NEW.completed_at,
            COALESCE(NEW.created_at, clock_timestamp()), clock_timestamp()
        ) RETURNING id INTO NEW.id;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE system_logs SET
            status = NEW.status,
            error_message = NEW.error_message,
            completed_at = NEW.completed_at,
            metadata = jsonb_build_object(
                'total_students', NEW.total_students,
                'fully_allocated', NEW.fully_allocated,
                'partially_allocated', NEW.partially_allocated,
                'unallocated', NEW.unallocated,
                'summary', NEW.summary
            ),
            updated_at = clock_timestamp()
        WHERE id = OLD.id AND log_type = 'allocation_run';
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_allocation_runs_insert_update
INSTEAD OF INSERT OR UPDATE ON allocation_runs
FOR EACH ROW EXECUTE FUNCTION trg_allocation_runs_io();

-- Triggers for Timetable Jobs View
CREATE OR REPLACE FUNCTION trg_timetable_jobs_io()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO system_logs (
            id, log_type, campus_id, academic_year, semester, status, progress, user_id,
            error_message, metadata, started_at, completed_at, created_at, updated_at
        ) VALUES (
            COALESCE(NEW.id, gen_random_uuid()),
            'timetable_job', NEW.campus_id, NEW.academic_year, NEW.semester, NEW.status,
            COALESCE(NEW.progress, 0),
            COALESCE(NEW.triggered_by, auth.uid()),
            NEW.error_message,
            jsonb_build_object('config', COALESCE(NEW.config, '{}'::jsonb)),
            COALESCE(NEW.started_at, clock_timestamp()), NEW.completed_at,
            COALESCE(NEW.created_at, clock_timestamp()), clock_timestamp()
        ) RETURNING id INTO NEW.id;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE system_logs SET
            status = NEW.status,
            progress = NEW.progress,
            error_message = NEW.error_message,
            completed_at = NEW.completed_at,
            metadata = jsonb_build_object('config', COALESCE(NEW.config, '{}'::jsonb)),
            updated_at = clock_timestamp()
        WHERE id = OLD.id AND log_type = 'timetable_job';
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_timetable_jobs_insert_update
INSTEAD OF INSERT OR UPDATE ON timetable_generation_jobs
FOR EACH ROW EXECUTE FUNCTION trg_timetable_jobs_io();

-- Triggers for Audit Logs View
CREATE OR REPLACE FUNCTION trg_audit_logs_io()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO system_logs (
            id, log_type, event_type, user_id, user_role, action, resource_type,
            resource_id, status, error_message, metadata, ip_address, user_agent, created_at, updated_at
        ) VALUES (
            COALESCE(NEW.id, gen_random_uuid()),
            'audit_event', NEW.event_type, NEW.user_id, NEW.user_role, NEW.action,
            NEW.resource_type, NEW.resource_id, NEW.status, NEW.error_message,
            COALESCE(NEW.metadata, '{}'::jsonb), NEW.ip_address, NEW.user_agent,
            COALESCE(NEW.created_at, clock_timestamp()), clock_timestamp()
        ) RETURNING id INTO NEW.id;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_logs_insert
INSTEAD OF INSERT ON audit_logs
FOR EACH ROW EXECUTE FUNCTION trg_audit_logs_io();

-- =============================================================================
-- PART 6: STORED PROCEDURES & SECURITY DEFINER RPC FUNCTIONS
-- =============================================================================

-- Drop existing functions first so return types can be changed safely.
-- PostgreSQL error 42P13 prevents CREATE OR REPLACE from altering return types.
DROP FUNCTION IF EXISTS apply_course_allocation(UUID, UUID, TEXT, SMALLINT, JSONB, JSONB);
DROP FUNCTION IF EXISTS promote_campus_students(UUID);
DROP FUNCTION IF EXISTS delete_campus_cascade(UUID);
DROP FUNCTION IF EXISTS delete_department_cascade(UUID);

-- 1. Atomic Course Allocation Applicator (V2)
CREATE OR REPLACE FUNCTION apply_course_allocation(
    p_run_id UUID,
    p_campus_id UUID,
    p_academic_year TEXT,
    p_semester SMALLINT,
    p_allocations JSONB,
    p_unallocated JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    item JSONB;
    v_student_id UUID;
    v_reg_id UUID;
    v_slot_key TEXT;
    v_course_id UUID;
    v_meta JSONB;
    v_sql TEXT;
BEGIN
    -- Reset non-fixed elective slots back to NULL for this cohort
    UPDATE student_registrations sr
    SET
        slot_1_course_id = CASE WHEN sr.allocation_metadata->'slot_1'->>'allocated_by' = 'fixed' THEN sr.slot_1_course_id ELSE NULL END,
        slot_2_course_id = CASE WHEN sr.allocation_metadata->'slot_2'->>'allocated_by' = 'fixed' THEN sr.slot_2_course_id ELSE NULL END,
        slot_3_course_id = CASE WHEN sr.allocation_metadata->'slot_3'->>'allocated_by' = 'fixed' THEN sr.slot_3_course_id ELSE NULL END,
        slot_4_course_id = CASE WHEN sr.allocation_metadata->'slot_4'->>'allocated_by' = 'fixed' THEN sr.slot_4_course_id ELSE NULL END,
        slot_5_course_id = CASE WHEN sr.allocation_metadata->'slot_5'->>'allocated_by' = 'fixed' THEN sr.slot_5_course_id ELSE NULL END,
        slot_6_course_id = CASE WHEN sr.allocation_metadata->'slot_6'->>'allocated_by' = 'fixed' THEN sr.slot_6_course_id ELSE NULL END,
        allocation_metadata = jsonb_strip_nulls(
            jsonb_build_object(
                'slot_1', CASE WHEN sr.allocation_metadata->'slot_1'->>'allocated_by' = 'fixed' THEN sr.allocation_metadata->'slot_1' ELSE NULL END,
                'slot_2', CASE WHEN sr.allocation_metadata->'slot_2'->>'allocated_by' = 'fixed' THEN sr.allocation_metadata->'slot_2' ELSE NULL END,
                'slot_3', CASE WHEN sr.allocation_metadata->'slot_3'->>'allocated_by' = 'fixed' THEN sr.allocation_metadata->'slot_3' ELSE NULL END,
                'slot_4', CASE WHEN sr.allocation_metadata->'slot_4'->>'allocated_by' = 'fixed' THEN sr.allocation_metadata->'slot_4' ELSE NULL END,
                'slot_5', CASE WHEN sr.allocation_metadata->'slot_5'->>'allocated_by' = 'fixed' THEN sr.allocation_metadata->'slot_5' ELSE NULL END,
                'slot_6', CASE WHEN sr.allocation_metadata->'slot_6'->>'allocated_by' = 'fixed' THEN sr.allocation_metadata->'slot_6' ELSE NULL END
            )
        )
    WHERE sr.campus_id = p_campus_id
      AND sr.academic_year = p_academic_year
      AND sr.semester = p_semester;

    -- Apply allocated slots
    FOR item IN SELECT * FROM jsonb_array_elements(p_allocations)
    LOOP
        v_student_id := (item->>'student_id')::UUID;
        v_slot_key   := item->>'slot_key';
        v_course_id  := (item->>'course_id')::UUID;
        v_meta       := item->'metadata';

        SELECT id INTO v_reg_id FROM student_registrations
        WHERE student_id = v_student_id AND academic_year = p_academic_year AND semester = p_semester;

        IF v_reg_id IS NOT NULL THEN
            v_sql := format(
                'UPDATE student_registrations SET %I = $1, allocation_metadata = jsonb_set(COALESCE(allocation_metadata, ''{}''::jsonb), ARRAY[$2], $3, true) WHERE id = $4',
                v_slot_key || '_course_id'
            );
            EXECUTE v_sql USING v_course_id, v_slot_key, v_meta, v_reg_id;
        END IF;

        UPDATE registration_preferences
        SET allocation_metadata = jsonb_set(COALESCE(allocation_metadata, '{}'::jsonb), ARRAY[v_slot_key], v_meta, true),
            updated_at = timezone('utc'::text, now())
        WHERE student_id = v_student_id AND academic_year = p_academic_year AND semester = p_semester;
    END LOOP;

    -- Apply unallocated metadata
    FOR item IN SELECT * FROM jsonb_array_elements(p_unallocated)
    LOOP
        v_student_id := (item->>'student_id')::UUID;
        v_slot_key   := item->>'slot_key';
        v_meta       := item->'metadata';

        SELECT id INTO v_reg_id FROM student_registrations
        WHERE student_id = v_student_id AND academic_year = p_academic_year AND semester = p_semester;

        IF v_reg_id IS NOT NULL THEN
            v_sql := format(
                'UPDATE student_registrations SET %I = NULL, allocation_metadata = jsonb_set(COALESCE(allocation_metadata, ''{}''::jsonb), ARRAY[$1], $2, true) WHERE id = $3',
                v_slot_key || '_course_id'
            );
            EXECUTE v_sql USING v_slot_key, v_meta, v_reg_id;
        END IF;

        UPDATE registration_preferences
        SET allocation_metadata = jsonb_set(COALESCE(allocation_metadata, '{}'::jsonb), ARRAY[v_slot_key], v_meta, true),
            updated_at = timezone('utc'::text, now())
        WHERE student_id = v_student_id AND academic_year = p_academic_year AND semester = p_semester;
    END LOOP;

    -- Recalculate credit sums on student_registrations
    UPDATE student_registrations sr
    SET total_credits = COALESCE(
        (SELECT SUM(c.credits)
         FROM courses c
         WHERE c.id IN (
             sr.slot_1_course_id, sr.slot_2_course_id, sr.slot_3_course_id,
             sr.slot_4_course_id, sr.slot_5_course_id, sr.slot_6_course_id
         )), 0)
    WHERE sr.campus_id = p_campus_id
      AND sr.academic_year = p_academic_year
      AND sr.semester = p_semester;

    RETURN jsonb_build_object(
        'success', true,
        'allocated_slots_applied', jsonb_array_length(p_allocations),
        'unallocated_slots_applied', jsonb_array_length(p_unallocated)
    );
END;
$$;

-- 2. Campus Student Promotion Procedure
CREATE OR REPLACE FUNCTION promote_campus_students(p_campus_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE students
    SET current_semester = current_semester + 1
    WHERE campus_id = p_campus_id AND current_semester < 10;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;

    UPDATE campus_settings
    SET last_promoted_at = timezone('utc'::text, now())
    WHERE campus_id = p_campus_id;

    RETURN jsonb_build_object('success', true, 'promoted_count', v_count);
END;
$$;

-- 3. Cascade Deletion Helpers
CREATE OR REPLACE FUNCTION delete_campus_cascade(p_campus_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    DELETE FROM campuses WHERE id = p_campus_id;
END;
$$;

CREATE OR REPLACE FUNCTION delete_department_cascade(p_dept_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    DELETE FROM departments WHERE id = p_dept_id;
END;
$$;

-- 4. Restrict RPC execute permissions to service_role only
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

-- =============================================================================
-- PART 7: HIGH-PERFORMANCE INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_system_logs_type_created ON system_logs (log_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_job_lookup ON system_logs (log_type, campus_id, academic_year, semester, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reg_pref_lookup ON registration_preferences (campus_id, academic_year, semester);
CREATE INDEX IF NOT EXISTS idx_reg_pref_student ON registration_preferences (student_id, semester, academic_year);
CREATE INDEX IF NOT EXISTS idx_course_prereq_rules_course_id ON course_prerequisite_rules (course_id);
CREATE INDEX IF NOT EXISTS idx_period_att_slot_date ON period_attendance (timetable_slot_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_period_att_student_id ON period_attendance (student_id);
CREATE INDEX IF NOT EXISTS idx_period_att_course_id ON period_attendance (course_id);
CREATE INDEX IF NOT EXISTS idx_period_unlock_slot_id ON period_unlock_requests (timetable_slot_id);
CREATE INDEX IF NOT EXISTS idx_csi_student_date ON campus_sign_ins (student_id, signed_in_date);
CREATE INDEX IF NOT EXISTS idx_csi_campus_date ON campus_sign_ins (campus_id, signed_in_date);

-- =============================================================================
-- PART 8: ROW LEVEL SECURITY (RLS) HARDENING & LEAST-PRIVILEGE POLICIES
-- =============================================================================

-- Enable RLS across all 20 public tables
ALTER TABLE campuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE campus_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_prerequisite_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculty ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE semester_blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_course_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE period_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE period_unlock_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE campus_sign_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- 1. Remove dangerous blanket policies on any public table
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
        EXECUTE format('DROP POLICY IF EXISTS "service_role_all_%I" ON %I;', t, t);
        EXECUTE format('CREATE POLICY "service_role_all_%I" ON %I FOR ALL TO service_role USING (true) WITH CHECK (true);', t, t);
    END LOOP;
END;
$$;

-- 2. Reference Data: Read-only for authenticated users
DROP POLICY IF EXISTS campuses_select_auth ON campuses;
CREATE POLICY campuses_select_auth ON campuses FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS departments_select_auth ON departments;
CREATE POLICY departments_select_auth ON departments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS campus_settings_select_auth ON campus_settings;
CREATE POLICY campus_settings_select_auth ON campus_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS courses_select_auth ON courses;
CREATE POLICY courses_select_auth ON courses FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS blueprints_select_auth ON semester_blueprints;
CREATE POLICY blueprints_select_auth ON semester_blueprints FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS prereq_select_auth ON course_prerequisite_rules;
CREATE POLICY prereq_select_auth ON course_prerequisite_rules FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS timetable_slots_select_auth ON time_slots;
CREATE POLICY timetable_slots_select_auth ON time_slots FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS timetable_entries_select_auth ON timetable_entries;
CREATE POLICY timetable_entries_select_auth ON timetable_entries FOR SELECT TO authenticated USING (true);

-- 3. Profile Tables: Own record access
DROP POLICY IF EXISTS students_select_own ON students;
CREATE POLICY students_select_own ON students FOR SELECT TO authenticated USING (id = auth.uid());

DROP POLICY IF EXISTS faculty_select_own ON faculty;
CREATE POLICY faculty_select_own ON faculty FOR SELECT TO authenticated USING (id = auth.uid());

-- 4. Student Registrations: Own record access
DROP POLICY IF EXISTS registrations_select_own ON student_registrations;
CREATE POLICY registrations_select_own ON student_registrations FOR SELECT TO authenticated USING (student_id = auth.uid());

-- 5. Registration Preferences: Own record access with deadline check
DROP POLICY IF EXISTS preferences_select_own ON registration_preferences;
CREATE POLICY preferences_select_own ON registration_preferences FOR SELECT TO authenticated USING (student_id = auth.uid());

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

-- 6. Teacher Course Assignments
DROP POLICY IF EXISTS "Allow read assignments for authenticated users" ON teacher_course_assignments;
CREATE POLICY "Allow read assignments for authenticated users"
    ON teacher_course_assignments FOR SELECT TO authenticated USING (true);

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

-- 7. Period Attendance
DROP POLICY IF EXISTS period_attendance_select_auth ON period_attendance;
DROP POLICY IF EXISTS "Students can view own period attendance" ON period_attendance;
CREATE POLICY period_attendance_select_auth ON period_attendance
    FOR SELECT TO authenticated USING (student_id = auth.uid() OR marked_by = auth.uid());

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

-- 8. Period Unlock Requests
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

-- 9. Campus Sign-Ins
DROP POLICY IF EXISTS "Students can view own campus sign-in records" ON campus_sign_ins;
DROP POLICY IF EXISTS "Students insert own campus sign-ins" ON campus_sign_ins;
DROP POLICY IF EXISTS "Students can insert own campus sign-in records" ON campus_sign_ins;

CREATE POLICY "Students can view own campus sign-in records"
    ON campus_sign_ins FOR SELECT TO authenticated USING (student_id = auth.uid());

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

DROP POLICY IF EXISTS "Admins and Directors can view all campus sign-in records" ON campus_sign_ins;
CREATE POLICY "Admins and Directors can view all campus sign-in records"
    ON campus_sign_ins FOR ALL TO authenticated
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('campus_director', 'superadmin')
        OR (auth.jwt() ->> 'role') IN ('campus_director', 'superadmin')
        OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('campus_director', 'superadmin')
    );

-- 10. Consent Records
DROP POLICY IF EXISTS consent_select_own ON consent_records;
CREATE POLICY consent_select_own ON consent_records FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS consent_insert_own ON consent_records;
CREATE POLICY consent_insert_own ON consent_records FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- =============================================================================
-- PART 9: MASTER INSTITUTIONAL SEED DATA UPSERT (ON CONFLICT DO UPDATE)
-- =============================================================================

-- 1. Campuses (4 University Campuses)
INSERT INTO campuses (id, name, code, center_latitude, center_longitude, radius_meters, morning_cutoff_time, midday_split_time, evening_cutoff_time, day_end_time) VALUES
('5b5289d5-17eb-43ba-832e-19883e9eaada', 'KUC Mangattuparamba', 'MANGAT', 11.9388, 75.3687, 500, '09:30:00', '13:30:00', '15:30:00', '17:00:00'),
('feed55c6-deea-46b7-9fa1-a97cfabf0838', 'Dr. Janaki Ammal Campus', 'THALAS', 11.7583, 75.5262, 500, '09:30:00', '13:30:00', '15:30:00', '17:00:00'),
('b351869a-8ea8-4e30-b505-1fe559554161', 'Dr. P.K. Rajan Memorial Campus', 'NILESH', 12.2472, 75.1278, 500, '09:30:00', '13:30:00', '15:30:00', '17:00:00'),
('2a05b3e6-c2cf-4011-8b81-18f034431de8', 'Swami Anandatheertha Campus', 'PAYYAN', 12.0983, 75.2072, 500, '09:30:00', '13:30:00', '15:30:00', '17:00:00')
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name, 
    code = EXCLUDED.code,
    center_latitude = EXCLUDED.center_latitude,
    center_longitude = EXCLUDED.center_longitude,
    radius_meters = EXCLUDED.radius_meters,
    morning_cutoff_time = EXCLUDED.morning_cutoff_time,
    midday_split_time = EXCLUDED.midday_split_time,
    evening_cutoff_time = EXCLUDED.evening_cutoff_time,
    day_end_time = EXCLUDED.day_end_time;

-- 2. Campus Settings (Active Registration Window)
INSERT INTO campus_settings (campus_id, academic_year, min_credits, max_credits, deadline, last_promoted_at) VALUES
('5b5289d5-17eb-43ba-832e-19883e9eaada', '2026-27', 18, 26, '2026-10-31 18:29:59+00', '2026-07-18 15:12:50.089+00'),
('feed55c6-deea-46b7-9fa1-a97cfabf0838', '2026-27', 18, 26, '2026-10-31 18:29:59+00', NULL),
('b351869a-8ea8-4e30-b505-1fe559554161', '2026-27', 18, 26, '2026-10-31 18:29:59+00', NULL),
('2a05b3e6-c2cf-4011-8b81-18f034431de8', '2026-27', 18, 26, '2026-10-31 18:29:59+00', NULL)
ON CONFLICT (campus_id) DO UPDATE SET 
    academic_year = EXCLUDED.academic_year, 
    min_credits = EXCLUDED.min_credits,
    max_credits = EXCLUDED.max_credits,
    deadline = EXCLUDED.deadline;

-- 3. Departments (13 Academic Departments)
INSERT INTO departments (id, name, code, campus_id) VALUES
('96a54058-8437-46a3-9815-ae49deab0999', 'Information Technology', 'IT', '5b5289d5-17eb-43ba-832e-19883e9eaada'),
('a8a70f5e-3130-4a2a-8329-4e4365d683b5', 'Mathematical Science', 'MAT', '5b5289d5-17eb-43ba-832e-19883e9eaada'),
('71ba995f-fa2d-461b-8971-73c4fd00dac7', 'Physical Education & Sports', 'PES', '5b5289d5-17eb-43ba-832e-19883e9eaada'),
('b68264cf-6b23-409f-b4bd-0617e37ebb15', 'Environmental Studies', 'EVS', '5b5289d5-17eb-43ba-832e-19883e9eaada'),
('9cfa61d3-ed11-4d78-9001-54c76035fbcb', 'School Of Behavioural Sciences', 'SBS', '5b5289d5-17eb-43ba-832e-19883e9eaada'),
('f2f08c07-581a-434c-89c5-83ae47030a0e', 'Statistical Sciences', 'STA', '5b5289d5-17eb-43ba-832e-19883e9eaada'),
('7898c34b-e8bf-4acc-be44-9b42d185e605', 'Department of Economics', 'ECO', '5b5289d5-17eb-43ba-832e-19883e9eaada'),
('3cabe38e-2fe2-4ff6-9bc6-9f564fa2b8a2', 'Department of Wood Science & Technology', 'SWT', '5b5289d5-17eb-43ba-832e-19883e9eaada'),
('35984692-74e0-4772-a01e-fae2622ff773', 'Department of Studies in English', 'ENG', 'feed55c6-deea-46b7-9fa1-a97cfabf0838'),
('e814d190-e1c2-4731-b2ec-d97d5dc897e0', 'History', 'HIS', 'feed55c6-deea-46b7-9fa1-a97cfabf0838'),
('f2ccdb04-8628-4f33-947c-440b55170bd7', 'Department of Malayalam', 'MAL', 'b351869a-8ea8-4e30-b505-1fe559554161'),
('1366fb8a-21f8-4c71-a355-74caf50a20af', 'Department of Hindi', 'HIN', 'b351869a-8ea8-4e30-b505-1fe559554161'),
('b1870668-6a16-42c0-99fb-71fa2a9179d8', 'Department of Geography', 'GEO', '2a05b3e6-c2cf-4011-8b81-18f034431de8')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code, campus_id = EXCLUDED.campus_id;

-- 4. Master Courses (60 Courses across Semesters 1 and 3)
INSERT INTO courses (
    id, course_code, title, department_id, semester, credits, category, tag,
    theory_hours_per_week, practical_hours_per_week, seat_limit, prerequisite_course_ids
) VALUES
-- English AEC (Thalas Campus - Available system-wide)
('e5f63cb4-00ae-4b62-825c-b8257c193db6', 'KU01AECENG101', 'Practical English Language Skills', '35984692-74e0-4772-a01e-fae2622ff773', 1, 3, 'AEC', 'AEC-1', 3, 0, 60, '{}'),
('44c92bf6-d7ba-42cd-a27f-2c68f24ac48e', 'KU01AECENG102', 'English For Business Communication', '35984692-74e0-4772-a01e-fae2622ff773', 1, 3, 'AEC', 'AEC-2', 3, 0, 60, '{}'),

-- Information Technology (IT)
('61098a8f-e12f-4783-a89b-0942df4df30d', 'KU01DSCCSE101', 'Principles of Programming', '96a54058-8437-46a3-9815-ae49deab0999', 1, 4, 'DSC', NULL, 2, 4, 60, '{}'),
('170ff803-3ffd-4312-96a4-2fbed41ed28f', 'KU01MDCCSE101', 'Foundations of Information and Communication Technologies', '96a54058-8437-46a3-9815-ae49deab0999', 1, 3, 'MDC', 'MDC-1', 2, 2, 60, '{}'),
('51002dd3-bf9e-474b-b168-79beb5719c80', 'KU03DSCCSE201', 'Introduction to Data Structure', '96a54058-8437-46a3-9815-ae49deab0999', 3, 4, 'DSC', NULL, 2, 4, 60, '{}'),
('e0131617-d886-45e2-b3a5-607aba2ad625', 'KU03DSCCSE202', 'Object oriented Programming using C++', '96a54058-8437-46a3-9815-ae49deab0999', 3, 4, 'DSC', NULL, 2, 4, 60, '{}'),
('a2040ac0-a977-44df-8426-aaf9669b7cae', 'KU03DSCCSE203', 'Engineering Physics', '96a54058-8437-46a3-9815-ae49deab0999', 3, 4, 'DSC', NULL, 2, 4, 60, '{}'),
('fa1f04d2-ea57-4493-95ae-80513f6b5770', 'KU03DSCCSE204', 'Scientific Computing', '96a54058-8437-46a3-9815-ae49deab0999', 3, 4, 'DSC', NULL, 3, 2, 60, '{}'),

-- Mathematical Science (MAT)
('35c67958-5284-45a6-9fbe-5d8c28ed6c79', 'KU01DSCMAT101', 'Logic And Set Theory', 'a8a70f5e-3130-4a2a-8329-4e4365d683b5', 1, 4, 'DSC', NULL, 4, 0, 60, '{}'),
('e95c7af9-98e5-4726-bdd7-c4482f59040a', 'KU01MDCMAT101', 'Elementary Mathematics -1', 'a8a70f5e-3130-4a2a-8329-4e4365d683b5', 1, 3, 'MDC', 'MDC-1', 3, 0, 60, '{}'),
('5dcb9e70-2cd0-4b56-95b4-98faec051a8a', 'KU02MDCMAT101', 'Elementary Mathematics -2', 'a8a70f5e-3130-4a2a-8329-4e4365d683b5', 1, 3, 'MDC', 'MDC-1', 3, 0, 60, '{}'),
('ec9a44d9-7b3d-4081-948c-cee4a68ec573', 'KU03DSCMAT201', 'Calculus II', 'a8a70f5e-3130-4a2a-8329-4e4365d683b5', 3, 4, 'DSC', NULL, 4, 0, 60, '{}'),
('ee9fc6d5-26e8-41f6-9235-c15d84aa39ac', 'KU03DSCMAT202', 'Differential Equations', 'a8a70f5e-3130-4a2a-8329-4e4365d683b5', 3, 4, 'DSC', NULL, 4, 0, 60, '{}'),
('db57cfe2-c81e-4f7f-a64c-14f22427babb', 'KU03DSCMAT203', 'Number Theory', 'a8a70f5e-3130-4a2a-8329-4e4365d683b5', 3, 4, 'DSC', NULL, 4, 0, 60, '{}'),
('4f87ff1a-c21e-4adb-b17c-05b380e173c6', 'KU03DSCMAT204', 'Numerical Analysis', 'a8a70f5e-3130-4a2a-8329-4e4365d683b5', 3, 4, 'DSC', NULL, 4, 0, 60, '{}'),

-- Statistical Sciences (STA)
('1ddc28ff-0c59-4044-ba42-0b58a7c06b13', 'KU01DSCSTA101', 'Descriptive Statistics', 'f2f08c07-581a-434c-89c5-83ae47030a0e', 1, 4, 'DSC', NULL, 3, 2, 60, '{}'),
('2d59b642-c058-4b90-ae75-d8d8773a684d', 'KU01MDCSTA101', 'Basic Statistics', 'f2f08c07-581a-434c-89c5-83ae47030a0e', 1, 3, 'MDC', 'MDC-1', 2, 2, 60, '{}'),
('65c229d8-6915-4eba-a67a-953d5cc8b106', 'KU03DSCSTA201', 'Theory of Random Variables', 'f2f08c07-581a-434c-89c5-83ae47030a0e', 3, 4, 'DSC', NULL, 3, 2, 60, '{}'),
('8af07352-c1f1-4eca-9da2-f5cd608a6599', 'KU03DSCSTA202', 'Distribution Theory-I', 'f2f08c07-581a-434c-89c5-83ae47030a0e', 3, 4, 'DSC', NULL, 3, 2, 60, '{}'),
('639d1054-5f14-44d5-9669-be59dac81f94', 'KU03DSCSTA203', 'Matrix Theory', 'f2f08c07-581a-434c-89c5-83ae47030a0e', 3, 4, 'DSC', NULL, 3, 2, 60, '{}'),
('eeda7161-6af8-48fa-9b0e-68c0698f1bb0', 'KU03DSCSTA204', 'Statistical Computing Using SPSS', 'f2f08c07-581a-434c-89c5-83ae47030a0e', 3, 4, 'DSC', NULL, 1, 6, 60, '{}'),
('a69ffb3d-5f43-4323-99e7-7cc2dc215104', 'KU03DSCSTA205', 'Probability Distributions', 'f2f08c07-581a-434c-89c5-83ae47030a0e', 3, 4, 'DSC', NULL, 3, 0, 60, '{}'),
('ffd4c12c-cf80-4d30-9d11-870f5c8bb848', 'KU03DSCSTA206', 'Sampling Techniques', 'f2f08c07-581a-434c-89c5-83ae47030a0e', 3, 4, 'DSC', NULL, 3, 0, 60, '{}'),
('29159311-ece9-4b9b-ba1e-fd9a079f01c8', 'KU03MDCSTA202', 'Applied Statistical Inference', 'f2f08c07-581a-434c-89c5-83ae47030a0e', 3, 3, 'MDC', 'MDC-3', 2, 2, 60, '{}'),

-- Economics (ECO)
('3fa747bb-8bba-4208-b43e-df2f82c3b034', 'KU01DSCECO101', 'Introduction to Economics', '7898c34b-e8bf-4acc-be44-9b42d185e605', 1, 4, 'DSC', NULL, 4, 0, 60, '{}'),
('71c381ce-fb7f-41e0-8ad0-7d0d74fa2810', 'KU01MDCECO101', 'Economics of Tourism and Development', '7898c34b-e8bf-4acc-be44-9b42d185e605', 1, 3, 'MDC', 'MDC-1', 3, 0, 60, '{}'),
('4fc7d940-9ff9-4588-a1c2-73a3b0ca98f2', 'KU01MDCECO102', 'Health Economics', '7898c34b-e8bf-4acc-be44-9b42d185e605', 1, 3, 'MDC', 'MDC-1', 3, 0, 60, '{}'),
('69911223-63c7-4ede-8e2c-71998ca01161', 'KU01MDCECO103', 'Economics of Natural Resources', '7898c34b-e8bf-4acc-be44-9b42d185e605', 1, 3, 'MDC', 'MDC-1', 3, 0, 60, '{}'),
('15e82757-6541-42ab-bf6c-8bc6d48d0ba9', 'KU03DSCECO201', 'Introduction to Micro Economics', '7898c34b-e8bf-4acc-be44-9b42d185e605', 3, 4, 'DSC', NULL, 4, 0, 60, '{}'),
('d28d37bb-51ea-448e-9eee-3a7c610fa48f', 'KU03DSCECO202', 'Introduction to Macro Economics', '7898c34b-e8bf-4acc-be44-9b42d185e605', 3, 4, 'DSC', NULL, 4, 0, 60, '{}'),
('a54a5aae-626f-4760-b00b-3eeb3300c8ce', 'KU03DSCECO203', 'Introduction to Indian Economy', '7898c34b-e8bf-4acc-be44-9b42d185e605', 3, 4, 'DSC', NULL, 4, 0, 60, '{}'),
('aa1c463f-e17d-49b2-a43d-6f244cf8c610', 'KU03DSCECO204', 'Quantitative Techniques for Data Analysis', '7898c34b-e8bf-4acc-be44-9b42d185e605', 3, 4, 'DSC', NULL, 4, 0, 60, '{}'),
('8dfb1f1a-a3f9-4bdb-96ba-83c53e15ccf7', 'KU03MDCECO201', 'Kerala Studies', '7898c34b-e8bf-4acc-be44-9b42d185e605', 3, 3, 'MDC', 'MDC-3', 3, 0, 60, '{}'),
('39ddae34-015e-4931-bc1d-fcb4cc870bbe', 'KU03MDCECO202', 'Nutrition Economics', '7898c34b-e8bf-4acc-be44-9b42d185e605', 3, 3, 'MDC', 'MDC-3', 3, 0, 60, '{}'),
('686185ec-5fa6-4493-a7bd-8237cfd99416', 'KU03MDCECO203', 'Optimisation Techniques', '7898c34b-e8bf-4acc-be44-9b42d185e605', 3, 3, 'MDC', 'MDC-3', 3, 0, 60, '{}'),
('f9d7ac58-847a-4bee-a3cb-25cbf46e753a', 'KU03VACECO201', 'AI in Daily Life', '7898c34b-e8bf-4acc-be44-9b42d185e605', 3, 3, 'VAC', 'VAC-3', 2, 0, 60, '{}'),
('acef9f7a-be11-4c74-93ee-cb171b74c08a', 'KU03VACECO202', 'Database on Indian Economy', '7898c34b-e8bf-4acc-be44-9b42d185e605', 3, 3, 'VAC', 'VAC-3', 3, 0, 60, '{}'),

-- Physical Education & Sports (PES)
('abd49d0a-30fe-4e69-bfdc-f0e150a5d5aa', 'KU01DSCPES101', 'Foundations of Human Anatomy', '71ba995f-fa2d-461b-8971-73c4fd00dac7', 1, 4, 'DSC', NULL, 4, 0, 60, '{}'),
('978c321e-ea10-47fb-871a-960c7f969fdb', 'KU01MDCPES101', 'Foundation Of Physical Education, Exercise Science And Sport', '71ba995f-fa2d-461b-8971-73c4fd00dac7', 1, 3, 'MDC', 'MDC-1', 3, 0, 60, '{}'),
('fadd3f2f-6650-4f44-94fe-526e2b561ee7', 'KU03DSCPES201', 'Science Of Human Movement', '71ba995f-fa2d-461b-8971-73c4fd00dac7', 3, 4, 'DSC', NULL, 4, 0, 60, '{}'),
('e527f30c-ae64-4ea9-843a-66eb61451bfc', 'KU03DSCPES202', 'Tests, Measurements And Evaluation In Physical Education And Sports', '71ba995f-fa2d-461b-8971-73c4fd00dac7', 3, 4, 'DSC', NULL, 4, 0, 60, '{}'),
('70aac1b4-a359-470e-8efd-ab944ac15cd0', 'KU03DSCPES203', 'Health Science Education', '71ba995f-fa2d-461b-8971-73c4fd00dac7', 3, 4, 'DSC', NULL, 4, 0, 60, '{}'),
('f8cde6d7-e8ec-4fb0-a2c4-e0a017cf8a8b', 'KU03DSCPES204', 'Major Game – Kho-Kho/Kabaddi', '71ba995f-fa2d-461b-8971-73c4fd00dac7', 3, 4, 'DSC', NULL, 0, 2, 60, '{}'),
('735dc827-e00e-4de8-899f-3b83f064af9a', 'KU03VACPES101', 'Yoga For Health', '71ba995f-fa2d-461b-8971-73c4fd00dac7', 3, 3, 'VAC', 'VAC-3', 2, 0, 60, '{}'),
('feee93d4-36dc-4fbe-b7c7-035141a31775', 'KU03VACPES102', 'Health & Wellness', '71ba995f-fa2d-461b-8971-73c4fd00dac7', 3, 3, 'VAC', 'VAC-3', 2, 0, 60, '{}'),

-- School Of Behavioural Sciences (SBS)
('7cc973dd-e54c-4b3d-969f-cab8e8034e60', 'KU01DSCPSY101', 'Foundations of Psychology', '9cfa61d3-ed11-4d78-9001-54c76035fbcb', 1, 4, 'DSC', NULL, 2, 1, 60, '{}'),
('04a5225c-2e65-4a1c-90c2-9a888dd3f8e8', 'KU01MDCPSY101', 'Psychology of Everyday Life', '9cfa61d3-ed11-4d78-9001-54c76035fbcb', 1, 3, 'MDC', 'MDC-1', 2, 1, 60, '{}'),
('174e18f8-1056-467f-806c-7b0aaa5dc7f1', 'KU03DSCPSY201', 'History and Perspectives of Psychological Science', '9cfa61d3-ed11-4d78-9001-54c76035fbcb', 3, 4, 'DSC', NULL, 2, 1, 60, '{}'),
('4edc2e73-4e8f-47e5-9554-c63f8703752a', 'KU03DSCPSY202', 'Personality: Approaches and Contemporary Application', '9cfa61d3-ed11-4d78-9001-54c76035fbcb', 3, 4, 'DSC', NULL, 2, 1, 60, '{}'),
('b6764f50-1a19-492f-a320-1aa3250ab35b', 'KU03DSCPSY203', 'Social Psychology', '9cfa61d3-ed11-4d78-9001-54c76035fbcb', 3, 4, 'DSC', NULL, 2, 1, 60, '{}'),
('ff3d5d95-7443-409e-9705-723ca116f8a6', 'KU03DSCPSY204', 'Child and Adolescent Psychology', '9cfa61d3-ed11-4d78-9001-54c76035fbcb', 3, 4, 'DSC', NULL, 2, 1, 60, '{}'),
('6b42afec-8119-4374-8c5d-699a53ebba87', 'KU03MDCPSY201', 'Psychology of Gender and Sexuality', '9cfa61d3-ed11-4d78-9001-54c76035fbcb', 3, 3, 'MDC', 'MDC-3', 2, 1, 60, '{}'),
('c39b0d8e-1000-4704-b785-d3000926c03b', 'KU03VACPSY201', 'Ethics And Pro Social Behavior', '9cfa61d3-ed11-4d78-9001-54c76035fbcb', 3, 3, 'VAC', 'VAC-3', 2, 1, 60, '{}'),

-- Environmental Studies (EVS)
('258d1fa9-b118-4ff0-a318-b3355f29c873', 'KU01DSCEVS101', 'Fundamentals of Environmental Science', 'b68264cf-6b23-409f-b4bd-0617e37ebb15', 1, 4, 'DSC', NULL, 2, 1, 60, '{}'),
('c97e3a5a-1ee6-474d-bb0e-17198e64151f', 'KU03DSCEVS201', 'Environmental Geology', 'b68264cf-6b23-409f-b4bd-0617e37ebb15', 3, 4, 'DSC', NULL, 2, 1, 60, '{}'),
('faacb2b4-a59e-4427-82bd-7a4c2dacd773', 'KU03DSCEVS202', 'Biodiversity Conservation', 'b68264cf-6b23-409f-b4bd-0617e37ebb15', 3, 4, 'DSC', NULL, 2, 1, 60, '{}'),
('d9da9673-d216-40db-9a0b-8f5e4e31d787', 'KU03DSCEVS203', 'Fundamentals of Environmental Chemistry', 'b68264cf-6b23-409f-b4bd-0617e37ebb15', 3, 4, 'DSC', NULL, 2, 1, 60, '{}'),
('3a21c5cc-fc1c-4cb7-9d19-475ff060bd8a', 'KU03DSCEVS204', 'Practical in Ecology', 'b68264cf-6b23-409f-b4bd-0617e37ebb15', 3, 4, 'DSC', NULL, 2, 1, 60, '{}'),

-- Wood Science & Technology (SWT)
('ad36f861-683d-4ab7-a936-21a64bc59ecf', 'KU01DSCWST101', 'Forestry And Dendrology', '3cabe38e-2fe2-4ff6-9bc6-9f564fa2b8a2', 1, 4, 'DSC', NULL, 2, 1, 60, '{}'),

-- Geography (GEO - Payyan Campus)
('e465df06-1556-4421-be69-f5216554e492', 'KU01DSCGEO101', 'Introduction to Dynamic Earth', 'b1870668-6a16-42c0-99fb-71fa2a9179d8', 1, 4, 'DSC', NULL, 0, 0, 60, '{}'),

-- History (HIS - Thalas Campus)
('e8140001-e1c2-4731-b2ec-d97d5dc89701', 'KU01DSCHIS101', 'History of Early India', 'e814d190-e1c2-4731-b2ec-d97d5dc897e0', 1, 4, 'DSC', NULL, 4, 0, 60, '{}'),
('e8140002-e1c2-4731-b2ec-d97d5dc89702', 'KU03DSCHIS201', 'History of Medieval India', 'e814d190-e1c2-4731-b2ec-d97d5dc897e0', 3, 4, 'DSC', NULL, 4, 0, 60, '{}'),
('e8140003-e1c2-4731-b2ec-d97d5dc89703', 'KU03DSCHIS202', 'History of Modern India', 'e814d190-e1c2-4731-b2ec-d97d5dc897e0', 3, 4, 'DSC', NULL, 4, 0, 60, '{}'),
('e8140004-e1c2-4731-b2ec-d97d5dc89704', 'KU03DSCHIS203', 'Aspects of World History', 'e814d190-e1c2-4731-b2ec-d97d5dc897e0', 3, 4, 'DSC', NULL, 4, 0, 60, '{}')
ON CONFLICT (id) DO UPDATE SET
    course_code = EXCLUDED.course_code,
    title = EXCLUDED.title,
    department_id = EXCLUDED.department_id,
    semester = EXCLUDED.semester,
    credits = EXCLUDED.credits,
    category = EXCLUDED.category,
    tag = EXCLUDED.tag,
    theory_hours_per_week = EXCLUDED.theory_hours_per_week,
    practical_hours_per_week = EXCLUDED.practical_hours_per_week,
    seat_limit = EXCLUDED.seat_limit;

-- 5. Semester Blueprints (13 Blueprints across Semesters 1 and 3)
INSERT INTO semester_blueprints (
    id, department_id, semester, min_credits, max_credits,
    slot_1_name, slot_1_rule, slot_1_target,
    slot_2_name, slot_2_rule, slot_2_target,
    slot_3_name, slot_3_rule, slot_3_target,
    slot_4_name, slot_4_rule, slot_4_target,
    slot_5_name, slot_5_rule, slot_5_target,
    slot_6_name, slot_6_rule, slot_6_target,
    pathways
) VALUES
-- 1. Mathematical Science S3
('2231f10e-e9dd-45d7-bc3c-0fc47b82ee80', 'a8a70f5e-3130-4a2a-8329-4e4365d683b5', 3, 22, 22,
 'MAJOR 1', 'DEPT_RESTRICTED', 'MAT,STA',
 'MAJOR 2', 'DEPT_RESTRICTED', 'MAT,STA',
 'MAJOR 3', 'DEPT_RESTRICTED', 'MAT,STA',
 'MAJOR 4', 'DEPT_RESTRICTED', 'STA,MAT',
 'MDC', 'GLOBAL_BASKET', 'MDC-3',
 'VAC', 'GLOBAL_BASKET', 'VAC-3',
 '[{"id": "6fc5f211-411e-4896-978a-c97d4ce2890c", "name": "Default", "slots": [{"name": "MAJOR 1", "rule": "FIXED", "target": "KU03DSCMAT201"}, {"name": "MAJOR 2", "rule": "FIXED", "target": "KU03DSCMAT202"}, {"name": "MAJOR 3", "rule": "FIXED", "target": "KU03DSCMAT203"}, {"name": "MAJOR 4", "rule": "FIXED", "target": "KU03DSCMAT204"}, {"name": "MDC", "rule": "GLOBAL_BASKET", "target": "MDC-3"}, {"name": "VAC", "rule": "GLOBAL_BASKET", "target": "VAC-3"}]}]'::jsonb),

-- 2. Mathematical Science S1
('6a805fcd-9646-4e37-bbb9-27c633979884', 'a8a70f5e-3130-4a2a-8329-4e4365d683b5', 1, 21, 21,
 'MAJOR ', 'FIXED', 'KU01DSCMAT101',
 'MINOR 1', 'EXCLUDE_DEPT', 'MAT',
 'MINOR 2', 'EXCLUDE_DEPT', 'MAT',
 'MDC', 'GLOBAL_BASKET', 'MDC-1',
 'AEC 1', 'GLOBAL_BASKET', 'AEC-1',
 'AEC 2', 'GLOBAL_BASKET', 'AEC-2',
 '[{"id": "6fc5f211-411e-4896-978a-c97d4ce2890c", "name": "Default", "slots": [{"name": "MAJOR ", "rule": "FIXED", "target": "KU01DSCMAT101"}, {"name": "MINOR 1", "rule": "EXCLUDE_DEPT", "target": "MAT"}, {"name": "MINOR 2", "rule": "EXCLUDE_DEPT", "target": "MAT"}, {"name": "MDC", "rule": "GLOBAL_BASKET", "target": "MDC-1"}, {"name": "AEC 1", "rule": "GLOBAL_BASKET", "target": "AEC-1"}, {"name": "AEC 2", "rule": "GLOBAL_BASKET", "target": "AEC-2"}]}]'::jsonb),

-- 3. Environmental Studies S1
('7cbcbbfe-50e0-4ccb-aba1-a7528f71f251', 'b68264cf-6b23-409f-b4bd-0617e37ebb15', 1, 21, 22,
 'MAJOR', 'FIXED', 'KU01DSCEVS101',
 'MINOR 1', 'FIXED', 'KU01DSCEVS101',
 'MINOR 2', 'EXCLUDE_DEPT', 'EVS,MAT,STA',
 'MDC', 'EXCLUDE_DEPT', 'EVS,STA,MAT',
 'AEC 1', 'GLOBAL_BASKET', 'AEC-1',
 'AEC 2', 'GLOBAL_BASKET', 'AEC-2',
 '[{"id": "6fc5f211-411e-4896-978a-c97d4ce2890c", "name": "Default", "slots": [{"name": "MAJOR", "rule": "FIXED", "target": "KU01DSCEVS101"}, {"name": "MINOR 1", "rule": "EXCLUDE_DEPT", "target": "EVS"}, {"name": "MINOR 2", "rule": "EXCLUDE_DEPT", "target": "EVS"}, {"name": "MDC", "rule": "GLOBAL_BASKET", "target": "MDC-1"}, {"name": "AEC 1", "rule": "GLOBAL_BASKET", "target": "AEC-1"}, {"name": "AEC 2", "rule": "GLOBAL_BASKET", "target": "AEC-2"}]}]'::jsonb),

-- 4. Information Technology S3
('801a9cfe-65ae-4714-a142-2305f0c5ec62', '96a54058-8437-46a3-9815-ae49deab0999', 3, 22, 22,
 'MAJOR 1 ', 'FIXED', 'KU03DSCCSE202',
 'MAJOR 2', 'FIXED', 'KU03DSCCSE201',
 'MAJOR 3', 'FIXED', 'KU03DSCCSE203',
 'MINOR 1', 'EXCLUDE_DEPT', 'IT',
 'MDC', 'GLOBAL_BASKET', 'MDC-3',
 'VAC ', 'GLOBAL_BASKET', 'VAC-3',
 '[{"id": "6fc5f211-411e-4896-978a-c97d4ce2890c", "name": "Default", "slots": [{"name": "MAJOR 1 ", "rule": "FIXED", "target": "KU03DSCCSE201"}, {"name": "MAJOR 2", "rule": "FIXED", "target": "KU03DSCCSE202"}, {"name": "MAJOR 3", "rule": "FIXED", "target": "KU03DSCCSE203"}, {"name": "MINOR 1", "rule": "EXCLUDE_DEPT", "target": "IT"}, {"name": "MDC", "rule": "GLOBAL_BASKET", "target": "MDC-3"}, {"name": "VAC ", "rule": "GLOBAL_BASKET", "target": "VAC-3"}]}]'::jsonb),

-- 5. Department of Economics S1
('9782d3c1-52a6-4007-ba73-d6fc5a3c7b39', '7898c34b-e8bf-4acc-be44-9b42d185e605', 1, 21, 21,
 'MAJOR', 'FIXED', 'KU01DSCECO101',
 'Minor 1', 'EXCLUDE_DEPT', 'ECO',
 'MINOR 2', 'EXCLUDE_DEPT', 'ECO',
 'MDC', 'GLOBAL_BASKET', 'MDC-1',
 'AEC 1', 'GLOBAL_BASKET', 'AEC-1',
 'AEC 2', 'GLOBAL_BASKET', 'AEC-2',
 '[{"id": "6fc5f211-411e-4896-978a-c97d4ce2890c", "name": "Default", "slots": [{"name": "MAJOR", "rule": "FIXED", "target": "KU01DSCECO101"}, {"name": "Minor 1", "rule": "EXCLUDE_DEPT", "target": "ECO"}, {"name": "MINOR 2", "rule": "EXCLUDE_DEPT", "target": "ECO"}, {"name": "MDC", "rule": "GLOBAL_BASKET", "target": "MDC-1"}, {"name": "AEC 1", "rule": "GLOBAL_BASKET", "target": "AEC-1"}, {"name": "AEC 2", "rule": "GLOBAL_BASKET", "target": "AEC-2"}]}]'::jsonb),

-- 6. Environmental Studies S3
('ad9c7582-32eb-4598-af70-187636f31658', 'b68264cf-6b23-409f-b4bd-0617e37ebb15', 3, 22, 22,
 'MAJOR 1', 'FIXED', 'KU03DSCEVS201',
 'MAJOR 2', 'FIXED', 'KU03DSCEVS202',
 'MAJOR 3', 'FIXED', 'KU03DSCEVS203',
 'MINOR 1', 'EXCLUDE_DEPT', 'EVS',
 'MDC', 'GLOBAL_BASKET', 'MDC-3',
 'VAC', 'GLOBAL_BASKET', 'VAC-3',
 '[{"id": "6fc5f211-411e-4896-978a-c97d4ce2890c", "name": "Default", "slots": [{"name": "MAJOR 1", "rule": "FIXED", "target": "KU03DSCEVS201"}, {"name": "MAJOR 2", "rule": "FIXED", "target": "KU03DSCEVS202"}, {"name": "MAJOR 3", "rule": "FIXED", "target": "KU03DSCEVS203"}, {"name": "MINOR 1", "rule": "EXCLUDE_DEPT", "target": "EVS"}, {"name": "MDC", "rule": "GLOBAL_BASKET", "target": "MDC-3"}, {"name": "VAC", "rule": "GLOBAL_BASKET", "target": "VAC-3"}]}]'::jsonb),

-- 7. School Of Behavioural Sciences S1
('b341fe4d-4cdf-4e0d-9203-a9c6cfb9025c', '9cfa61d3-ed11-4d78-9001-54c76035fbcb', 1, 21, 21,
 'Major 1', 'FIXED', 'KU01DSCPSY101',
 'Minor 1', 'EXCLUDE_DEPT', 'SBS',
 'Minor 2', 'EXCLUDE_DEPT', 'SBS',
 'MDC ', 'GLOBAL_BASKET', 'MDC-1',
 'AEC 1', 'GLOBAL_BASKET', 'AEC-1',
 'AEC 2', 'GLOBAL_BASKET', 'AEC-2',
 '[{"id": "6fc5f211-411e-4896-978a-c97d4ce2890c", "name": "Default", "slots": [{"name": "Major 1", "rule": "FIXED", "target": "KU01DSCPSY101"}, {"name": "Minor 1", "rule": "EXCLUDE_DEPT", "target": "SBS"}, {"name": "Minor 2", "rule": "EXCLUDE_DEPT", "target": "SBS"}, {"name": "MDC ", "rule": "GLOBAL_BASKET", "target": "MDC-1"}, {"name": "AEC 1", "rule": "GLOBAL_BASKET", "target": "AEC-1"}, {"name": "AEC 2", "rule": "GLOBAL_BASKET", "target": "AEC-2"}]}]'::jsonb),

-- 8. Physical Education & Sports S1
('b6af96d9-e9eb-4535-b800-b365db289a6d', '71ba995f-fa2d-461b-8971-73c4fd00dac7', 1, 21, 21,
 'MAJOR', 'FIXED', 'KU01DSCPES101',
 'MINOR 1', 'EXCLUDE_DEPT', 'PES',
 'MINOR 2', 'EXCLUDE_DEPT', 'PES',
 'MDC', 'GLOBAL_BASKET', 'MDC-1',
 'AEC 1', 'GLOBAL_BASKET', 'AEC-1',
 'AEC 2', 'GLOBAL_BASKET', 'AEC-2',
 '[{"id": "6fc5f211-411e-4896-978a-c97d4ce2890c", "name": "SEM 1", "slots": [{"name": "MAJOR", "rule": "FIXED", "target": "KU01DSCPES101"}, {"name": "MINOR 1", "rule": "EXCLUDE_DEPT", "target": "PES"}, {"name": "MINOR 2", "rule": "EXCLUDE_DEPT", "target": "PES"}, {"name": "MDC", "rule": "GLOBAL_BASKET", "target": "MDC-1"}, {"name": "AEC 1", "rule": "GLOBAL_BASKET", "target": "AEC-1"}, {"name": "AEC 2", "rule": "GLOBAL_BASKET", "target": "AEC-2"}]}]'::jsonb),

-- 9. Department of Economics S3
('b7d83b09-9f29-451a-9192-3d7d945e6825', '7898c34b-e8bf-4acc-be44-9b42d185e605', 3, 22, 22,
 'MAJOR 1', 'FIXED', 'KU03DSCECO201',
 'MAJOR 2', 'FIXED', 'KU03DSCECO202',
 'MAJOR 3', 'FIXED', 'KU03DSCECO203',
 'MAJOR 4', 'FIXED', 'KU03DSCECO204',
 'MDC ', 'GLOBAL_BASKET', 'MDC-3',
 'VAC', 'GLOBAL_BASKET', 'VAC-3',
 '[{"id": "6fc5f211-411e-4896-978a-c97d4ce2890c", "name": "Default", "slots": [{"name": "MAJOR 1", "rule": "FIXED", "target": "KU03DSCECO201"}, {"name": "MAJOR 2", "rule": "FIXED", "target": "KU03DSCECO202"}, {"name": "MAJOR 3", "rule": "FIXED", "target": "KU03DSCECO203"}, {"name": "MAJOR 4", "rule": "FIXED", "target": "KU03DSCECO204"}, {"name": "MDC ", "rule": "GLOBAL_BASKET", "target": "MDC-3"}, {"name": "VAC", "rule": "GLOBAL_BASKET", "target": "VAC-3"}]}]'::jsonb),

-- 10. History S1
('ba0cd4e4-c95f-4056-bd2f-1b49e86d481f', 'e814d190-e1c2-4731-b2ec-d97d5dc897e0', 1, 21, 21,
 'Major 1', 'FIXED', 'KU01DSCHIS101',
 'Minor 1', 'EXCLUDE_DEPT', 'HIS',
 'Minor 2', 'EXCLUDE_DEPT', 'HIS',
 'MDC', 'GLOBAL_BASKET', 'MDC-1',
 'AEC 1', 'GLOBAL_BASKET', 'AEC-1',
 'AEC 2', 'GLOBAL_BASKET', 'AEC-2',
 '[{"id": "6fc5f211-411e-4896-978a-c97d4ce2890c", "name": "Default", "slots": [{"name": "Major 1", "rule": "FIXED", "target": "KU01DSCHIS101"}, {"name": "Minor 1", "rule": "EXCLUDE_DEPT", "target": "HIS"}, {"name": "Minor 2", "rule": "EXCLUDE_DEPT", "target": "HIS"}, {"name": "MDC", "rule": "GLOBAL_BASKET", "target": "MDC-1"}, {"name": "AEC 1", "rule": "GLOBAL_BASKET", "target": "AEC-1"}, {"name": "AEC 2", "rule": "GLOBAL_BASKET", "target": "AEC-2"}]}]'::jsonb),

-- 11. Physical Education & Sports S3
('c8064b33-3936-4fee-91ff-ffbc6e8b6816', '71ba995f-fa2d-461b-8971-73c4fd00dac7', 3, 22, 22,
 'MAJOR 1', 'FIXED', 'KU03DSCPES201',
 'MAJOR 2', 'FIXED', 'KU03DSCPES202',
 'MAJOR 3', 'FIXED', 'KU03DSCPES203',
 'MINOR 1', 'FIXED', 'KU03DSCPES204',
 'MDC', 'GLOBAL_BASKET', 'MDC-3',
 'VAC', 'GLOBAL_BASKET', 'VAC-3',
 '[{"id": "6fc5f211-411e-4896-978a-c97d4ce2890c", "name": "Default", "slots": [{"name": "MAJOR 1", "rule": "FIXED", "target": "KU03DSCPES201"}, {"name": "MAJOR 2", "rule": "FIXED", "target": "KU03DSCPES202"}, {"name": "MAJOR 3", "rule": "FIXED", "target": "KU03DSCPES203"}, {"name": "MINOR 1", "rule": "FIXED", "target": "KU03DSCPES204"}, {"name": "MDC", "rule": "GLOBAL_BASKET", "target": "MDC-3"}, {"name": "VAC", "rule": "GLOBAL_BASKET", "target": "VAC-3"}]}]'::jsonb),

-- 12. Information Technology S1
('c9e59cc3-a643-484a-8d8a-dee319130e64', '96a54058-8437-46a3-9815-ae49deab0999', 1, 21, 21,
 'Major 1', 'FIXED', 'KU01DSCCSE101',
 'Minor 1', 'DEPT_RESTRICTED', 'MAT',
 'Minor 2', 'DEPT_RESTRICTED', 'STA',
 'MDC', 'GLOBAL_BASKET', 'MDC-1',
 'AEC 1', 'GLOBAL_BASKET', 'AEC-1',
 'AEC 2', 'GLOBAL_BASKET', 'AEC-2',
 '[{"id": "6fc5f211-411e-4896-978a-c97d4ce2890c", "name": "Default", "slots": [{"name": "Major 1", "rule": "FIXED", "target": "KU01DSCCSE101"}, {"name": "Minor 1", "rule": "DEPT_RESTRICTED", "target": "MAT"}, {"name": "Minor 2", "rule": "DEPT_RESTRICTED", "target": "STA"}, {"name": "MDC", "rule": "GLOBAL_BASKET", "target": "MDC-1"}, {"name": "AEC 1", "rule": "GLOBAL_BASKET", "target": "AEC-1"}, {"name": "AEC 2", "rule": "GLOBAL_BASKET", "target": "AEC-2"}]}]'::jsonb),

-- 13. History S3
('d90d5cf3-fd22-47bb-9401-894f0565feb1', 'e814d190-e1c2-4731-b2ec-d97d5dc897e0', 3, 22, 22,
 'MAJOR 1 ', 'FIXED', 'KU03DSCHIS201',
 'MAJOR 2', 'FIXED', 'KU03DSCHIS202',
 'MAJOR 3', 'FIXED', 'KU03DSCHIS203',
 'MINOR', 'EXCLUDE_DEPT', 'HIS',
 'MDC', 'GLOBAL_BASKET', 'MDC-3',
 'VAC', 'GLOBAL_BASKET', 'VAC-3',
 '[{"id": "6fc5f211-411e-4896-978a-c97d4ce2890c", "name": "Default", "slots": [{"name": "MAJOR 1 ", "rule": "FIXED", "target": "KU03DSCHIS201"}, {"name": "MAJOR 2", "rule": "FIXED", "target": "KU03DSCHIS202"}, {"name": "MAJOR 3", "rule": "FIXED", "target": "KU03DSCHIS203"}, {"name": "MINOR", "rule": "EXCLUDE_DEPT", "target": "HIS"}, {"name": "MDC", "rule": "GLOBAL_BASKET", "target": "MDC-3"}, {"name": "VAC", "rule": "GLOBAL_BASKET", "target": "VAC-3"}]}]'::jsonb)
ON CONFLICT (department_id, semester) DO UPDATE SET
    min_credits = EXCLUDED.min_credits,
    max_credits = EXCLUDED.max_credits,
    slot_1_name = EXCLUDED.slot_1_name, slot_1_rule = EXCLUDED.slot_1_rule, slot_1_target = EXCLUDED.slot_1_target,
    slot_2_name = EXCLUDED.slot_2_name, slot_2_rule = EXCLUDED.slot_2_rule, slot_2_target = EXCLUDED.slot_2_target,
    slot_3_name = EXCLUDED.slot_3_name, slot_3_rule = EXCLUDED.slot_3_rule, slot_3_target = EXCLUDED.slot_3_target,
    slot_4_name = EXCLUDED.slot_4_name, slot_4_rule = EXCLUDED.slot_4_rule, slot_4_target = EXCLUDED.slot_4_target,
    slot_5_name = EXCLUDED.slot_5_name, slot_5_rule = EXCLUDED.slot_5_rule, slot_5_target = EXCLUDED.slot_5_target,
    slot_6_name = EXCLUDED.slot_6_name, slot_6_rule = EXCLUDED.slot_6_rule, slot_6_target = EXCLUDED.slot_6_target,
    pathways = EXCLUDED.pathways;

-- 6. Time Slots (Standard academic schedule: 5 days x 6 periods = 30 slots)
DO $$
DECLARE
    d smallint;
    p smallint;
    st time;
    et time;
    start_times time[] := ARRAY['09:30:00'::time, '10:30:00'::time, '11:30:00'::time, '13:30:00'::time, '14:30:00'::time, '15:30:00'::time];
    end_times   time[] := ARRAY['10:30:00'::time, '11:30:00'::time, '12:30:00'::time, '14:30:00'::time, '15:30:00'::time, '16:30:00'::time];
BEGIN
    FOR d IN 1..5 LOOP
        FOR p IN 1..6 LOOP
            st := start_times[p];
            et := end_times[p];
            INSERT INTO time_slots (day_of_week, period_number, start_time, end_time, is_lab_block)
            VALUES (d, p, st, et, false)
            ON CONFLICT (day_of_week, period_number) DO UPDATE
            SET start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time;
        END LOOP;
    END LOOP;
END;
$$;

-- =============================================================================
-- PART 10: MIGRATION TRACKING RECORD
-- =============================================================================

INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('20260928_unified_master_schema_and_upsert', 'Unified master idempotent schema and institutional seed upsert', timezone('utc'::text, now()))
ON CONFLICT (version) DO UPDATE SET applied_at = EXCLUDED.applied_at;

-- End of unified master upsert script.
