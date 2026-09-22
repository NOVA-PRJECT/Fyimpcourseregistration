-- =============================================================================
-- FYIMP Course Registration Portal — Complete Unified Master Migration
-- Target Schema: PostgreSQL 15+ / Supabase (public)
-- Version: 3.0.0 (GoTrue Safe + Consolidated E2E Architecture)
-- =============================================================================

-- =============================================================================
-- STEP 1: EXTENSIONS
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- STEP 2: CLEAN TEARDOWN (Reverse Dependency Order with CASCADE)
-- =============================================================================
-- Drop compatibility views
DROP VIEW IF EXISTS allocation_runs CASCADE;
DROP VIEW IF EXISTS allocation_runs_legacy CASCADE;
DROP VIEW IF EXISTS timetable_generation_jobs CASCADE;
DROP VIEW IF EXISTS timetable_generation_jobs_legacy CASCADE;
DROP VIEW IF EXISTS audit_logs CASCADE;
DROP VIEW IF EXISTS audit_logs_legacy CASCADE;

-- Drop operational and tracking tables
DROP TABLE IF EXISTS consent_records CASCADE;
DROP TABLE IF EXISTS campus_sign_ins CASCADE;
DROP TABLE IF EXISTS period_unlock_requests CASCADE;
DROP TABLE IF EXISTS period_attendance CASCADE;
DROP TABLE IF EXISTS teacher_course_assignments CASCADE;

-- Drop timetable and scheduling tables
DROP TABLE IF EXISTS timetable_conflicts CASCADE;
DROP TABLE IF EXISTS timetable_entries CASCADE;
DROP TABLE IF EXISTS time_slots CASCADE;

-- Drop registration, blueprint, and logging tables
DROP TABLE IF EXISTS registration_preferences CASCADE;
DROP TABLE IF EXISTS student_registrations CASCADE;
DROP TABLE IF EXISTS semester_blueprints CASCADE;
DROP TABLE IF EXISTS system_logs CASCADE;

-- Drop core academic entities
DROP TABLE IF EXISTS course_prerequisite_rules CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS campus_settings CASCADE;
DROP TABLE IF EXISTS campuses CASCADE;

-- Drop role profile tables
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS faculty CASCADE;
DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS schema_migrations CASCADE;

-- =============================================================================
-- STEP 3: CORE INSTITUTIONAL & GOVERNANCE TABLES
-- =============================================================================

-- 1. CAMPUSES TABLE
CREATE TABLE campuses (
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

-- 2. CAMPUS SETTINGS TABLE (Window control, term limits, promotion audit)
CREATE TABLE campus_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campus_id UUID NOT NULL UNIQUE REFERENCES campuses(id) ON DELETE CASCADE,
    academic_year TEXT NOT NULL DEFAULT '2026-27',
    min_credits INTEGER NOT NULL DEFAULT 18,
    max_credits INTEGER NOT NULL DEFAULT 26,
    deadline TIMESTAMPTZ,
    last_promoted_at TIMESTAMPTZ
);

COMMENT ON TABLE campus_settings IS 'Campus-level academic governance, credit constraints, and term deadlines.';

-- 3. DEPARTMENTS TABLE
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE,
    campus_id UUID NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE departments IS 'Academic departments affiliated with specific university campuses.';

-- 4. COURSES TABLE
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    semester INTEGER NOT NULL CHECK (semester BETWEEN 1 AND 8),
    credits INTEGER NOT NULL CHECK (credits > 0),
    category TEXT NOT NULL CHECK (category IN ('DSC', 'MDC', 'VAC', 'AEC')),
    tag TEXT,
    theory_hours_per_week SMALLINT NOT NULL DEFAULT 0,
    practical_hours_per_week SMALLINT NOT NULL DEFAULT 0,
    seat_limit INTEGER NOT NULL DEFAULT 60,
    prerequisite_course_ids UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE courses IS 'Master catalog of academic courses, credit values, contact hours, and seat limits.';

-- 5. COURSE PREREQUISITE RULES TABLE
CREATE TABLE course_prerequisite_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    rule TEXT NOT NULL CHECK (rule IN ('COMPLETED_COURSE', 'COMPLETED_SEMESTER', 'DEPARTMENT')),
    target TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_course_rule_target UNIQUE(course_id, rule, target)
);

COMMENT ON TABLE course_prerequisite_rules IS 'Scoring rules evaluated during multi-round course allocation.';

-- =============================================================================
-- STEP 4: USER & ROLE PROFILES
-- =============================================================================

-- 6. ADMINS TABLE
CREATE TABLE admins (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'superadmin' CHECK (role IN ('superadmin', 'admin')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. FACULTY TABLE
CREATE TABLE faculty (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('hod', 'teaching_staff', 'campus_director', 'teacher')),
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    campus_id UUID NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. STUDENTS TABLE
CREATE TABLE students (
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

-- =============================================================================
-- STEP 5: REGISTRATION & BLUEPRINT TABLES
-- =============================================================================

-- 9. SEMESTER BLUEPRINTS TABLE
CREATE TABLE semester_blueprints (
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

-- 10. REGISTRATION PREFERENCES TABLE (Ranked choices & frozen timestamp)
CREATE TABLE registration_preferences (
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

-- 11. STUDENT REGISTRATIONS TABLE (Confirmed slot courses & totals)
CREATE TABLE student_registrations (
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
    allocation_metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(student_id, semester, academic_year)
);

-- =============================================================================
-- STEP 6: TIMETABLE & SCHEDULING TABLES
-- =============================================================================

-- 12. TIME SLOTS TABLE
CREATE TABLE time_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 6),
    period_number SMALLINT NOT NULL CHECK (period_number BETWEEN 1 AND 10),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_lab_block BOOLEAN NOT NULL DEFAULT false,
    lab_pair_with UUID REFERENCES time_slots(id) ON DELETE SET NULL,
    UNIQUE(day_of_week, period_number)
);

-- 13. TIMETABLE ENTRIES TABLE
CREATE TABLE timetable_entries (
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

-- 14. TIMETABLE CONFLICTS TABLE
CREATE TABLE timetable_conflicts (
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

-- =============================================================================
-- STEP 7: OPERATIONAL & ATTENDANCE TABLES
-- =============================================================================

-- 15. TEACHER COURSE ASSIGNMENTS TABLE
CREATE TABLE teacher_course_assignments (
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

-- 16. PERIOD ATTENDANCE TABLE
CREATE TABLE period_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES faculty(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    period_number SMALLINT NOT NULL CHECK (period_number BETWEEN 1 AND 10),
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
    is_locked BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(course_id, student_id, date, period_number)
);

-- 17. PERIOD UNLOCK REQUESTS TABLE
CREATE TABLE period_unlock_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES faculty(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    period_number SMALLINT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES faculty(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 18. CAMPUS SIGN INS TABLE (Zero Coordinate Retention GPS attendance)
CREATE TABLE campus_sign_ins (
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

-- 19. CONSENT RECORDS TABLE
CREATE TABLE consent_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    policy_version TEXT NOT NULL DEFAULT 'v1.0',
    accepted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, policy_version)
);

-- =============================================================================
-- STEP 8: UNIFIED LOGGING & BACKGROUND JOBS ENGINE
-- =============================================================================

-- 20. SYSTEM LOGS TABLE
CREATE TABLE system_logs (
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

-- Compatibility Views with INSTEAD OF triggers for zero-downtime backwards compatibility
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

CREATE OR REPLACE VIEW timetable_generation_jobs AS
SELECT 
    id, campus_id, academic_year, semester, status, progress, error_message,
    user_id AS triggered_by,
    COALESCE(metadata->'config', '{}'::jsonb) AS config,
    started_at, completed_at, created_at, updated_at
FROM system_logs WHERE log_type = 'timetable_job';

CREATE OR REPLACE VIEW timetable_generation_jobs_legacy AS SELECT * FROM timetable_generation_jobs;

CREATE OR REPLACE VIEW audit_logs AS
SELECT 
    id, event_type, user_id, user_role, action, resource_type, resource_id,
    status, error_message, metadata, ip_address, created_at
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
            resource_id, status, error_message, metadata, ip_address, created_at, updated_at
        ) VALUES (
            COALESCE(NEW.id, gen_random_uuid()),
            'audit_event', NEW.event_type, NEW.user_id, NEW.user_role, NEW.action,
            NEW.resource_type, NEW.resource_id, NEW.status, NEW.error_message,
            COALESCE(NEW.metadata, '{}'::jsonb), NEW.ip_address,
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
-- STEP 9: STORED PROCEDURES & RPC FUNCTIONS
-- =============================================================================

-- Atomic Course Allocation Applicator (V2)
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

-- Campus Student Promotion Procedure
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

-- Cascade Deletion Helpers
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

-- =============================================================================
-- STEP 10: ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================
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

-- Allow authenticated and service_role full read/write for test environment
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "service_role_all_%I" ON %I;', t, t);
        EXECUTE format('CREATE POLICY "service_role_all_%I" ON %I FOR ALL TO service_role USING (true) WITH CHECK (true);', t, t);
        
        EXECUTE format('DROP POLICY IF EXISTS "authenticated_select_%I" ON %I;', t, t);
        EXECUTE format('CREATE POLICY "authenticated_select_%I" ON %I FOR SELECT TO authenticated USING (true);', t, t);

        EXECUTE format('DROP POLICY IF EXISTS "authenticated_all_%I" ON %I;', t, t);
        EXECUTE format('CREATE POLICY "authenticated_all_%I" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true);', t, t);
    END LOOP;
END;
$$;

-- =============================================================================
-- STEP 11: INSTITUTIONAL SEED DATA (Exact Export Data)
-- =============================================================================

-- 1. CAMPUSES (4 real campuses from export)
INSERT INTO campuses (id, name, code, center_latitude, center_longitude, radius_meters, morning_cutoff_time, midday_split_time, evening_cutoff_time, day_end_time) VALUES
('5b5289d5-17eb-43ba-832e-19883e9eaada', 'KUC Mangattuparamba', 'MANGAT', 11.9388, 75.3687, 500, '09:30:00', '13:30:00', '15:30:00', '17:00:00'),
('feed55c6-deea-46b7-9fa1-a97cfabf0838', 'Dr. Janaki Ammal Campus', 'THALAS', 11.7583, 75.5262, 500, '09:30:00', '13:30:00', '15:30:00', '17:00:00'),
('b351869a-8ea8-4e30-b505-1fe559554161', 'Dr. P.K. Rajan Memorial Campus', 'NILESH', 12.2472, 75.1278, 500, '09:30:00', '13:30:00', '15:30:00', '17:00:00'),
('2a05b3e6-c2cf-4011-8b81-18f034431de8', 'Swami Anandatheertha Campus', 'PAYYAN', 12.0983, 75.2072, 500, '09:30:00', '13:30:00', '15:30:00', '17:00:00')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code;

-- 2. CAMPUS SETTINGS (Registration window open for Mangat)
INSERT INTO campus_settings (campus_id, academic_year, min_credits, max_credits, deadline, last_promoted_at) VALUES
('5b5289d5-17eb-43ba-832e-19883e9eaada', '2026-27', 18, 26, '2026-10-31 18:29:59+00', '2026-07-18 15:12:50.089+00'),
('feed55c6-deea-46b7-9fa1-a97cfabf0838', '2026-27', 18, 26, '2026-10-31 18:29:59+00', NULL),
('b351869a-8ea8-4e30-b505-1fe559554161', '2026-27', 18, 26, '2026-10-31 18:29:59+00', NULL),
('2a05b3e6-c2cf-4011-8b81-18f034431de8', '2026-27', 18, 26, '2026-10-31 18:29:59+00', NULL)
ON CONFLICT (campus_id) DO UPDATE SET academic_year = EXCLUDED.academic_year, deadline = EXCLUDED.deadline;

-- 3. DEPARTMENTS (13 departments from export)
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
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code;

-- 4. MASTER COURSES (All 60 courses from export)
INSERT INTO courses (id, course_code, title, department_id, semester, credits, category, tag, theory_hours_per_week, practical_hours_per_week, seat_limit) VALUES
-- English AEC (Thalas Campus - Available system-wide)
('e5f63cb4-00ae-4b62-825c-b8257c193db6', 'KU01AECENG101', 'Practical English Language Skills', '35984692-74e0-4772-a01e-fae2622ff773', 1, 3, 'AEC', 'AEC-1', 3, 0, 60),
('44c92bf6-d7ba-42cd-a27f-2c68f24ac48e', 'KU01AECENG102', 'English For Business Communication', '35984692-74e0-4772-a01e-fae2622ff773', 1, 3, 'AEC', 'AEC-2', 3, 0, 60),

-- Information Technology (IT)
('61098a8f-e12f-4783-a89b-0942df4df30d', 'KU01DSCCSE101', 'Principles of Programming', '96a54058-8437-46a3-9815-ae49deab0999', 1, 4, 'DSC', NULL, 2, 4, 60),
('170ff803-3ffd-4312-96a4-2fbed41ed28f', 'KU01MDCCSE101', 'Foundations of Information and Communication Technologies', '96a54058-8437-46a3-9815-ae49deab0999', 1, 3, 'MDC', 'MDC-1', 2, 2, 60),
('51002dd3-bf9e-474b-b168-79beb5719c80', 'KU03DSCCSE201', 'Introduction to Data Structure', '96a54058-8437-46a3-9815-ae49deab0999', 3, 4, 'DSC', NULL, 2, 4, 60),
('e0131617-d886-45e2-b3a5-607aba2ad625', 'KU03DSCCSE202', 'Object oriented Programming using C++', '96a54058-8437-46a3-9815-ae49deab0999', 3, 4, 'DSC', NULL, 2, 4, 60),
('a2040ac0-a977-44df-8426-aaf9669b7cae', 'KU03DSCCSE203', 'Engineering Physics', '96a54058-8437-46a3-9815-ae49deab0999', 3, 4, 'DSC', NULL, 2, 4, 60),
('fa1f04d2-ea57-4493-95ae-80513f6b5770', 'KU03DSCCSE204', 'Scientific Computing', '96a54058-8437-46a3-9815-ae49deab0999', 3, 4, 'DSC', NULL, 3, 2, 60),

-- Mathematical Science (MAT)
('35c67958-5284-45a6-9fbe-5d8c28ed6c79', 'KU01DSCMAT101', 'Logic And Set Theory', 'a8a70f5e-3130-4a2a-8329-4e4365d683b5', 1, 4, 'DSC', NULL, 4, 0, 60),
('e95c7af9-98e5-4726-bdd7-c4482f59040a', 'KU01MDCMAT101', 'Elementary Mathematics -1', 'a8a70f5e-3130-4a2a-8329-4e4365d683b5', 1, 3, 'MDC', 'MDC-1', 3, 0, 60),
('5dcb9e70-2cd0-4b56-95b4-98faec051a8a', 'KU02MDCMAT101', 'Elementary Mathematics -2', 'a8a70f5e-3130-4a2a-8329-4e4365d683b5', 1, 3, 'MDC', 'MDC-1', 3, 0, 60),
('ec9a44d9-7b3d-4081-948c-cee4a68ec573', 'KU03DSCMAT201', 'Calculus II', 'a8a70f5e-3130-4a2a-8329-4e4365d683b5', 3, 4, 'DSC', NULL, 4, 0, 60),
('ee9fc6d5-26e8-41f6-9235-c15d84aa39ac', 'KU03DSCMAT202', 'Differential Equations', 'a8a70f5e-3130-4a2a-8329-4e4365d683b5', 3, 4, 'DSC', NULL, 4, 0, 60),
('db57cfe2-c81e-4f7f-a64c-14f22427babb', 'KU03DSCMAT203', 'Number Theory', 'a8a70f5e-3130-4a2a-8329-4e4365d683b5', 3, 4, 'DSC', NULL, 4, 0, 60),
('4f87ff1a-c21e-4adb-b17c-05b380e173c6', 'KU03DSCMAT204', 'Numerical Analysis', 'a8a70f5e-3130-4a2a-8329-4e4365d683b5', 3, 4, 'DSC', NULL, 4, 0, 60),

-- Statistical Sciences (STA)
('1ddc28ff-0c59-4044-ba42-0b58a7c06b13', 'KU01DSCSTA101', 'Descriptive Statistics', 'f2f08c07-581a-434c-89c5-83ae47030a0e', 1, 4, 'DSC', NULL, 3, 2, 60),
('2d59b642-c058-4b90-ae75-d8d8773a684d', 'KU01MDCSTA101', 'Basic Statistics', 'f2f08c07-581a-434c-89c5-83ae47030a0e', 1, 3, 'MDC', 'MDC-1', 2, 2, 60),
('65c229d8-6915-4eba-a67a-953d5cc8b106', 'KU03DSCSTA201', 'Theory of Random Variables', 'f2f08c07-581a-434c-89c5-83ae47030a0e', 3, 4, 'DSC', NULL, 3, 2, 60),
('8af07352-c1f1-4eca-9da2-f5cd608a6599', 'KU03DSCSTA202', 'Distribution Theory-I', 'f2f08c07-581a-434c-89c5-83ae47030a0e', 3, 4, 'DSC', NULL, 3, 2, 60),
('639d1054-5f14-44d5-9669-be59dac81f94', 'KU03DSCSTA203', 'Matrix Theory', 'f2f08c07-581a-434c-89c5-83ae47030a0e', 3, 4, 'DSC', NULL, 3, 2, 60),
('eeda7161-6af8-48fa-9b0e-68c0698f1bb0', 'KU03DSCSTA204', 'Statistical Computing Using SPSS', 'f2f08c07-581a-434c-89c5-83ae47030a0e', 3, 4, 'DSC', NULL, 1, 6, 60),
('a69ffb3d-5f43-4323-99e7-7cc2dc215104', 'KU03DSCSTA205', 'Probability Distributions', 'f2f08c07-581a-434c-89c5-83ae47030a0e', 3, 4, 'DSC', NULL, 3, 0, 60),
('ffd4c12c-cf80-4d30-9d11-870f5c8bb848', 'KU03DSCSTA206', 'Sampling Techniques', 'f2f08c07-581a-434c-89c5-83ae47030a0e', 3, 4, 'DSC', NULL, 3, 0, 60),
('29159311-ece9-4b9b-ba1e-fd9a079f01c8', 'KU03MDCSTA202', 'Applied Statistical Inference', 'f2f08c07-581a-434c-89c5-83ae47030a0e', 3, 3, 'MDC', 'MDC-3', 2, 2, 60),

-- Economics (ECO)
('3fa747bb-8bba-4208-b43e-df2f82c3b034', 'KU01DSCECO101', 'Introduction to Economics', '7898c34b-e8bf-4acc-be44-9b42d185e605', 1, 4, 'DSC', NULL, 4, 0, 60),
('71c381ce-fb7f-41e0-8ad0-7d0d74fa2810', 'KU01MDCECO101', 'Economics of Tourism and Development', '7898c34b-e8bf-4acc-be44-9b42d185e605', 1, 3, 'MDC', 'MDC-1', 3, 0, 60),
('4fc7d940-9ff9-4588-a1c2-73a3b0ca98f2', 'KU01MDCECO102', 'Health Economics', '7898c34b-e8bf-4acc-be44-9b42d185e605', 1, 3, 'MDC', 'MDC-1', 3, 0, 60),
('69911223-63c7-4ede-8e2c-71998ca01161', 'KU01MDCECO103', 'Economics of Natural Resources', '7898c34b-e8bf-4acc-be44-9b42d185e605', 1, 3, 'MDC', 'MDC-1', 3, 0, 60),
('15e82757-6541-42ab-bf6c-8bc6d48d0ba9', 'KU03DSCECO201', 'Introduction to Micro Economics', '7898c34b-e8bf-4acc-be44-9b42d185e605', 3, 4, 'DSC', NULL, 4, 0, 60),
('d28d37bb-51ea-448e-9eee-3a7c610fa48f', 'KU03DSCECO202', 'Introduction to Macro Economics', '7898c34b-e8bf-4acc-be44-9b42d185e605', 3, 4, 'DSC', NULL, 4, 0, 60),
('a54a5aae-626f-4760-b00b-3eeb3300c8ce', 'KU03DSCECO203', 'Introduction to Indian Economy', '7898c34b-e8bf-4acc-be44-9b42d185e605', 3, 4, 'DSC', NULL, 4, 0, 60),
('aa1c463f-e17d-49b2-a43d-6f244cf8c610', 'KU03DSCECO204', 'Quantitative Techniques for Data Analysis', '7898c34b-e8bf-4acc-be44-9b42d185e605', 3, 4, 'DSC', NULL, 4, 0, 60),
('8dfb1f1a-a3f9-4bdb-96ba-83c53e15ccf7', 'KU03MDCECO201', 'Kerala Studies', '7898c34b-e8bf-4acc-be44-9b42d185e605', 3, 3, 'MDC', 'MDC-3', 3, 0, 60),
('39ddae34-015e-4931-bc1d-fcb4cc870bbe', 'KU03MDCECO202', 'Nutrition Economics', '7898c34b-e8bf-4acc-be44-9b42d185e605', 3, 3, 'MDC', 'MDC-3', 3, 0, 60),
('686185ec-5fa6-4493-a7bd-8237cfd99416', 'KU03MDCECO203', 'Optimisation Techniques', '7898c34b-e8bf-4acc-be44-9b42d185e605', 3, 3, 'MDC', 'MDC-3', 3, 0, 60),
('f9d7ac58-847a-4bee-a3cb-25cbf46e753a', 'KU03VACECO201', 'AI in Daily Life', '7898c34b-e8bf-4acc-be44-9b42d185e605', 3, 3, 'VAC', 'VAC-3', 2, 0, 60),
('acef9f7a-be11-4c74-93ee-cb171b74c08a', 'KU03VACECO202', 'Database on Indian Economy', '7898c34b-e8bf-4acc-be44-9b42d185e605', 3, 3, 'VAC', 'VAC-3', 3, 0, 60),

-- Physical Education & Sports (PES)
('abd49d0a-30fe-4e69-bfdc-f0e150a5d5aa', 'KU01DSCPES101', 'Foundations of Human Anatomy', '71ba995f-fa2d-461b-8971-73c4fd00dac7', 1, 4, 'DSC', NULL, 4, 0, 60),
('978c321e-ea10-47fb-871a-960c7f969fdb', 'KU01MDCPES101', 'Foundation Of Physical Education, Exercise Science And Sport', '71ba995f-fa2d-461b-8971-73c4fd00dac7', 1, 3, 'MDC', 'MDC-1', 3, 0, 60),
('fadd3f2f-6650-4f44-94fe-526e2b561ee7', 'KU03DSCPES201', 'Science Of Human Movement', '71ba995f-fa2d-461b-8971-73c4fd00dac7', 3, 4, 'DSC', NULL, 4, 0, 60),
('e527f30c-ae64-4ea9-843a-66eb61451bfc', 'KU03DSCPES202', 'Tests, Measurements And Evaluation In Physical Education And Sports', '71ba995f-fa2d-461b-8971-73c4fd00dac7', 3, 4, 'DSC', NULL, 4, 0, 60),
('70aac1b4-a359-470e-8efd-ab944ac15cd0', 'KU03DSCPES203', 'Health Science Education', '71ba995f-fa2d-461b-8971-73c4fd00dac7', 3, 4, 'DSC', NULL, 4, 0, 60),
('f8cde6d7-e8ec-4fb0-a2c4-e0a017cf8a8b', 'KU03DSCPES204', 'Major Game – Kho-Kho/Kabaddi', '71ba995f-fa2d-461b-8971-73c4fd00dac7', 3, 4, 'DSC', NULL, 0, 2, 60),
('735dc827-e00e-4de8-899f-3b83f064af9a', 'KU03VACPES101', 'Yoga For Health', '71ba995f-fa2d-461b-8971-73c4fd00dac7', 3, 3, 'VAC', 'VAC-3', 2, 0, 60),
('feee93d4-36dc-4fbe-b7c7-035141a31775', 'KU03VACPES102', 'Health & Wellness', '71ba995f-fa2d-461b-8971-73c4fd00dac7', 3, 3, 'VAC', 'VAC-3', 2, 0, 60),

-- School Of Behavioural Sciences (SBS)
('7cc973dd-e54c-4b3d-969f-cab8e8034e60', 'KU01DSCPSY101', 'Foundations of Psychology', '9cfa61d3-ed11-4d78-9001-54c76035fbcb', 1, 4, 'DSC', NULL, 2, 1, 60),
('04a5225c-2e65-4a1c-90c2-9a888dd3f8e8', 'KU01MDCPSY101', 'Psychology of Everyday Life', '9cfa61d3-ed11-4d78-9001-54c76035fbcb', 1, 3, 'MDC', 'MDC-1', 2, 1, 60),
('174e18f8-1056-467f-806c-7b0aaa5dc7f1', 'KU03DSCPSY201', 'History and Perspectives of Psychological Science', '9cfa61d3-ed11-4d78-9001-54c76035fbcb', 3, 4, 'DSC', NULL, 2, 1, 60),
('4edc2e73-4e8f-47e5-9554-c63f8703752a', 'KU03DSCPSY202', 'Personality: Approaches and Contemporary Application', '9cfa61d3-ed11-4d78-9001-54c76035fbcb', 3, 4, 'DSC', NULL, 2, 1, 60),
('b6764f50-1a19-492f-a320-1aa3250ab35b', 'KU03DSCPSY203', 'Social Psychology', '9cfa61d3-ed11-4d78-9001-54c76035fbcb', 3, 4, 'DSC', NULL, 2, 1, 60),
('ff3d5d95-7443-409e-9705-723ca116f8a6', 'KU03DSCPSY204', 'Child and Adolescent Psychology', '9cfa61d3-ed11-4d78-9001-54c76035fbcb', 3, 4, 'DSC', NULL, 2, 1, 60),
('6b42afec-8119-4374-8c5d-699a53ebba87', 'KU03MDCPSY201', 'Psychology of Gender and Sexuality', '9cfa61d3-ed11-4d78-9001-54c76035fbcb', 3, 3, 'MDC', 'MDC-3', 2, 1, 60),
('c39b0d8e-1000-4704-b785-d3000926c03b', 'KU03VACPSY201', 'Ethics And Pro Social Behavior', '9cfa61d3-ed11-4d78-9001-54c76035fbcb', 3, 3, 'VAC', 'VAC-3', 2, 1, 60),

-- Environmental Studies (EVS)
('258d1fa9-b118-4ff0-a318-b3355f29c873', 'KU01DSCEVS101', 'Fundamentals of Environmental Science', 'b68264cf-6b23-409f-b4bd-0617e37ebb15', 1, 4, 'DSC', NULL, 2, 1, 60),
('c97e3a5a-1ee6-474d-bb0e-17198e64151f', 'KU03DSCEVS201', 'Environmental Geology', 'b68264cf-6b23-409f-b4bd-0617e37ebb15', 3, 4, 'DSC', NULL, 2, 1, 60),
('faacb2b4-a59e-4427-82bd-7a4c2dacd773', 'KU03DSCEVS202', 'Biodiversity Conservation', 'b68264cf-6b23-409f-b4bd-0617e37ebb15', 3, 4, 'DSC', NULL, 2, 1, 60),
('d9da9673-d216-40db-9a0b-8f5e4e31d787', 'KU03DSCEVS203', 'Fundamentals of Environmental Chemistry', 'b68264cf-6b23-409f-b4bd-0617e37ebb15', 3, 4, 'DSC', NULL, 2, 1, 60),
('3a21c5cc-fc1c-4cb7-9d19-475ff060bd8a', 'KU03DSCEVS204', 'Practical in Ecology', 'b68264cf-6b23-409f-b4bd-0617e37ebb15', 3, 4, 'DSC', NULL, 2, 1, 60),

-- Wood Science & Technology (SWT)
('ad36f861-683d-4ab7-a936-21a64bc59ecf', 'KU01DSCWST101', 'Forestry And Dendrology', '3cabe38e-2fe2-4ff6-9bc6-9f564fa2b8a2', 1, 4, 'DSC', NULL, 2, 1, 60),

-- Geography (GEO - Payyan Campus)
('e465df06-1556-4421-be69-f5216554e492', 'KU01DSCGEO101', 'Introduction to Dynamic Earth', 'b1870668-6a16-42c0-99fb-71fa2a9179d8', 1, 4, 'DSC', NULL, 0, 0, 60)
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, course_code = EXCLUDED.course_code;

-- 5. SEMESTER BLUEPRINTS (Pre-configured for IT Department S1 and S3)
INSERT INTO semester_blueprints (
    department_id, semester, min_credits, max_credits,
    slot_1_name, slot_1_rule, slot_1_target,
    slot_2_name, slot_2_rule, slot_2_target,
    slot_3_name, slot_3_rule, slot_3_target,
    slot_4_name, slot_4_rule, slot_4_target,
    slot_5_name, slot_5_rule, slot_5_target,
    slot_6_name, slot_6_rule, slot_6_target,
    pathways
) VALUES
('96a54058-8437-46a3-9815-ae49deab0999', 1, 18, 26, 
 'Core Computing', 'FIXED', 'KU01DSCCSE101',
 'Multidisciplinary Elective', 'GLOBAL_BASKET', 'MDC-1',
 'English Communication', 'GLOBAL_BASKET', 'AEC-1',
 NULL, NULL, NULL,
 NULL, NULL, NULL,
 NULL, NULL, NULL,
 '[{"id":"pw-cs-std","name":"Computer Science Standard","description":"Standard IT NEP Track","slots":[{"slot":1,"name":"Core Computing","rule":"FIXED","target":"KU01DSCCSE101"},{"slot":2,"name":"Multidisciplinary Elective","rule":"GLOBAL_BASKET","target":"MDC-1"},{"slot":3,"name":"English Communication","rule":"GLOBAL_BASKET","target":"AEC-1"}]}]'::jsonb),

('96a54058-8437-46a3-9815-ae49deab0999', 3, 18, 26,
 'Data Structures', 'FIXED', 'KU03DSCCSE201',
 'OOP using C++', 'FIXED', 'KU03DSCCSE202',
 'Engineering Physics', 'FIXED', 'KU03DSCCSE203',
 'Scientific Computing', 'FIXED', 'KU03DSCCSE204',
 'Multidisciplinary Elective 3', 'GLOBAL_BASKET', 'MDC-3',
 'Value Added Course 3', 'GLOBAL_BASKET', 'VAC-3',
 '[{"id":"pw-cs-adv","name":"Advanced Software Systems","description":"S3 Core Track","slots":[{"slot":1,"name":"Data Structures","rule":"FIXED","target":"KU03DSCCSE201"},{"slot":2,"name":"OOP using C++","rule":"FIXED","target":"KU03DSCCSE202"},{"slot":3,"name":"Engineering Physics","rule":"FIXED","target":"KU03DSCCSE203"},{"slot":4,"name":"Scientific Computing","rule":"FIXED","target":"KU03DSCCSE204"},{"slot":5,"name":"Multidisciplinary Elective 3","rule":"GLOBAL_BASKET","target":"MDC-3"},{"slot":6,"name":"Value Added Course 3","rule":"GLOBAL_BASKET","target":"VAC-3"}]}]'::jsonb)
ON CONFLICT (department_id, semester) DO UPDATE SET 
 slot_1_name = EXCLUDED.slot_1_name, slot_1_rule = EXCLUDED.slot_1_rule, slot_1_target = EXCLUDED.slot_1_target,
 slot_2_name = EXCLUDED.slot_2_name, slot_2_rule = EXCLUDED.slot_2_rule, slot_2_target = EXCLUDED.slot_2_target,
 slot_3_name = EXCLUDED.slot_3_name, slot_3_rule = EXCLUDED.slot_3_rule, slot_3_target = EXCLUDED.slot_3_target,
 slot_4_name = EXCLUDED.slot_4_name, slot_4_rule = EXCLUDED.slot_4_rule, slot_4_target = EXCLUDED.slot_4_target,
 slot_5_name = EXCLUDED.slot_5_name, slot_5_rule = EXCLUDED.slot_5_rule, slot_5_target = EXCLUDED.slot_5_target,
 slot_6_name = EXCLUDED.slot_6_name, slot_6_rule = EXCLUDED.slot_6_rule, slot_6_target = EXCLUDED.slot_6_target,
 pathways = EXCLUDED.pathways;

-- 6. TIME SLOTS (Standard academic schedule: 5 days x 6 periods = 30 slots)
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

-- Version migration record
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    applied_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

INSERT INTO schema_migrations (version, name) VALUES ('3.0.0', 'FULL_CLEAN_SETUP_AND_TEST_SEED')
ON CONFLICT (version) DO NOTHING;

-- End of master migration
