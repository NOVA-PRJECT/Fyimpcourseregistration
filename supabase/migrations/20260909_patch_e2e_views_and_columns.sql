-- =============================================================================
-- Quick Patch: Add triggered_by to views, published_at to timetable_entries,
--              and foreign keys to students table for PostgREST joins.
-- =============================================================================

-- 1. Add published_at column to timetable_entries & fix pathway_id type
ALTER TABLE timetable_entries ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE registration_preferences ALTER COLUMN pathway_id TYPE TEXT;

-- 2. Add foreign keys from registration tables to students table (for PostgREST inner joins)
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

-- 3. Drop existing views and recreation to allow column reordering without 42P16 error
DROP VIEW IF EXISTS allocation_runs_legacy CASCADE;
DROP VIEW IF EXISTS allocation_runs CASCADE;

CREATE VIEW allocation_runs AS
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

CREATE VIEW allocation_runs_legacy AS SELECT * FROM allocation_runs;

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

-- 4. Drop and recreate TIMETABLE_GENERATION_JOBS View & Triggers
DROP VIEW IF EXISTS timetable_generation_jobs_legacy CASCADE;
DROP VIEW IF EXISTS timetable_generation_jobs CASCADE;

CREATE VIEW timetable_generation_jobs AS
SELECT 
    id, campus_id, academic_year, semester, status, progress, error_message,
    user_id AS triggered_by,
    COALESCE(metadata->'config', '{}'::jsonb) AS config,
    started_at, completed_at, created_at, updated_at
FROM system_logs WHERE log_type = 'timetable_job';

CREATE VIEW timetable_generation_jobs_legacy AS SELECT * FROM timetable_generation_jobs;

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

-- 5. Add assigned_at and assigned_by columns to teacher_course_assignments
ALTER TABLE teacher_course_assignments 
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES faculty(id) ON DELETE SET NULL;

ALTER TABLE teacher_course_assignments 
  ALTER COLUMN academic_year DROP NOT NULL,
  ALTER COLUMN semester DROP NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'teacher_course_assignments_unique'
           OR constraint_name = 'teacher_course_assignments_teacher_id_course_id_key'
    ) THEN
        ALTER TABLE teacher_course_assignments 
        ADD CONSTRAINT teacher_course_assignments_unique UNIQUE (teacher_id, course_id);
    END IF;
END;
$$;

-- 6. Recreate campus_sign_ins with Zero Coordinate Retention schema
DROP TABLE IF EXISTS campus_sign_ins CASCADE;

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

CREATE INDEX IF NOT EXISTS idx_csi_student_date ON campus_sign_ins(student_id, signed_in_date);
CREATE INDEX IF NOT EXISTS idx_csi_campus_date ON campus_sign_ins(campus_id, signed_in_date);

ALTER TABLE campus_sign_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students and staff view campus sign-in records"
    ON campus_sign_ins FOR SELECT
    TO authenticated
    USING (
        student_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM faculty f
            WHERE f.id = auth.uid()
              AND f.campus_id = campus_sign_ins.campus_id
        )
        OR EXISTS (
            SELECT 1 FROM admins a
            WHERE a.id = auth.uid()
        )
    );

CREATE POLICY "Students insert own campus sign-ins"
    ON campus_sign_ins FOR INSERT
    TO authenticated
    WITH CHECK (student_id = auth.uid());

CREATE POLICY "Staff manage campus sign-ins"
    ON campus_sign_ins FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM faculty f
            WHERE f.id = auth.uid()
              AND f.role IN ('hod', 'campus_director')
              AND f.campus_id = campus_sign_ins.campus_id
        )
        OR EXISTS (
            SELECT 1 FROM admins a
            WHERE a.id = auth.uid()
        )
    );
