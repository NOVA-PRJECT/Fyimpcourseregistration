-- =============================================================================
-- Migration: 20260908_merge_logging_and_job_tables.sql
-- Description: Unifies audit_logs, timetable_generation_jobs, and allocation_runs
--              into a single high-performance system_logs table with seamless
--              zero-downtime backward-compatibility views and triggers.
-- Target Schema: public
-- =============================================================================

-- 1. CREATE UNIFIED SYSTEM_LOGS TABLE
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Discriminator: Which kind of record is this?
    log_type TEXT NOT NULL CHECK (log_type IN ('audit_event', 'timetable_job', 'allocation_run', 'server_error')),

    -- Operational Status & Progress
    status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed', 'success', 'failure')),
    progress SMALLINT DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    error_message TEXT,
    error_stack TEXT,

    -- Academic & Campus Scope
    campus_id UUID REFERENCES campuses(id) ON DELETE CASCADE,
    academic_year TEXT,
    semester SMALLINT,

    -- Actor Context
    user_id UUID,
    user_role TEXT,

    -- Audit Event & Target Resource Context
    event_type TEXT,
    action TEXT,
    resource_type TEXT,
    resource_id UUID,

    -- Diagnostics
    ip_address INET,
    user_agent TEXT,
    route TEXT,

    -- Dynamic Metadata Context
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Execution Timestamps
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE system_logs IS 'Unified operational logging repository consolidating audit trails, background timetable generation jobs, and course allocation runs.';

-- 2. HIGH-EFFICIENCY INDEXES
CREATE INDEX IF NOT EXISTS idx_system_logs_type_created
    ON system_logs (log_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_logs_job_lookup
    ON system_logs (log_type, campus_id, academic_year, semester, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_logs_running_jobs
    ON system_logs (log_type, campus_id, academic_year, semester)
    WHERE status IN ('queued', 'running');

CREATE INDEX IF NOT EXISTS idx_system_logs_user_id
    ON system_logs (user_id)
    WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_system_logs_audit_events
    ON system_logs (log_type, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_logs_metadata_gin
    ON system_logs USING GIN (metadata);

-- 3. DATA BACKFILL FROM EXISTING TABLES (IF THEY EXIST)
DO $$
BEGIN
    -- Backfill audit_logs
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'audit_logs' AND table_type = 'BASE TABLE'
    ) THEN
        INSERT INTO system_logs (
            id, log_type, event_type, user_id, user_role, action, resource_type,
            resource_id, status, error_message, metadata, ip_address, created_at, updated_at
        )
        SELECT 
            id,
            'audit_event',
            event_type,
            user_id,
            user_role,
            action,
            resource_type,
            resource_id,
            status,
            error_message,
            COALESCE(metadata, '{}'::jsonb),
            ip_address,
            created_at,
            created_at
        FROM audit_logs
        ON CONFLICT (id) DO NOTHING;
    END IF;

    -- Backfill timetable_generation_jobs
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'timetable_generation_jobs' AND table_type = 'BASE TABLE'
    ) THEN
        INSERT INTO system_logs (
            id, log_type, academic_year, semester, campus_id, status, progress,
            error_message, user_id, started_at, completed_at, created_at, updated_at
        )
        SELECT 
            id,
            'timetable_job',
            academic_year,
            semester,
            campus_id,
            status,
            COALESCE(progress, 0),
            error_message,
            triggered_by,
            started_at,
            completed_at,
            created_at,
            COALESCE(updated_at, created_at)
        FROM timetable_generation_jobs
        ON CONFLICT (id) DO NOTHING;
    END IF;

    -- Backfill allocation_runs
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'allocation_runs' AND table_type = 'BASE TABLE'
    ) THEN
        INSERT INTO system_logs (
            id, log_type, academic_year, semester, campus_id, user_id,
            status, started_at, completed_at, error_message, created_at, updated_at
        )
        SELECT 
            id,
            'allocation_run',
            academic_year,
            semester,
            campus_id,
            triggered_by,
            status,
            triggered_at,
            completed_at,
            error_message,
            triggered_at,
            COALESCE(completed_at, triggered_at)
        FROM allocation_runs
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- 4. RENAME EXISTING BASE TABLES TO LEGACY BACKUPS
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs' AND table_type = 'BASE TABLE') THEN
        ALTER TABLE audit_logs RENAME TO audit_logs_legacy;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'timetable_generation_jobs' AND table_type = 'BASE TABLE') THEN
        ALTER TABLE timetable_generation_jobs RENAME TO timetable_generation_jobs_legacy;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'allocation_runs' AND table_type = 'BASE TABLE') THEN
        ALTER TABLE allocation_runs RENAME TO allocation_runs_legacy;
    END IF;
END $$;

-- 5. CREATE ZERO-DOWNTIME COMPATIBILITY VIEWS & TRIGGERS

-- A. TIMETABLE_GENERATION_JOBS VIEW & TRIGGERS
CREATE OR REPLACE VIEW timetable_generation_jobs AS
SELECT
    id,
    academic_year,
    semester,
    campus_id,
    status,
    progress,
    error_message,
    user_id AS triggered_by,
    started_at,
    completed_at,
    created_at,
    updated_at
FROM system_logs
WHERE log_type = 'timetable_job';

CREATE OR REPLACE FUNCTION trg_insert_timetable_generation_jobs()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO system_logs (
        id, log_type, academic_year, semester, campus_id, status, progress,
        error_message, user_id, started_at, completed_at, created_at, updated_at
    ) VALUES (
        COALESCE(NEW.id, gen_random_uuid()),
        'timetable_job',
        NEW.academic_year,
        NEW.semester,
        NEW.campus_id,
        COALESCE(NEW.status, 'queued'),
        COALESCE(NEW.progress, 0),
        NEW.error_message,
        NEW.triggered_by,
        NEW.started_at,
        NEW.completed_at,
        COALESCE(NEW.created_at, timezone('utc'::text, now())),
        COALESCE(NEW.updated_at, timezone('utc'::text, now()))
    )
    RETURNING id INTO NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_timetable_generation_jobs_insert ON timetable_generation_jobs;
CREATE TRIGGER trg_timetable_generation_jobs_insert
INSTEAD OF INSERT ON timetable_generation_jobs
FOR EACH ROW EXECUTE FUNCTION trg_insert_timetable_generation_jobs();

CREATE OR REPLACE FUNCTION trg_update_timetable_generation_jobs()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE system_logs
    SET
        status = COALESCE(NEW.status, status),
        progress = COALESCE(NEW.progress, progress),
        error_message = NEW.error_message,
        started_at = COALESCE(NEW.started_at, started_at),
        completed_at = COALESCE(NEW.completed_at, completed_at),
        updated_at = timezone('utc'::text, now())
    WHERE id = OLD.id AND log_type = 'timetable_job';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_timetable_generation_jobs_update ON timetable_generation_jobs;
CREATE TRIGGER trg_timetable_generation_jobs_update
INSTEAD OF UPDATE ON timetable_generation_jobs
FOR EACH ROW EXECUTE FUNCTION trg_update_timetable_generation_jobs();


-- B. ALLOCATION_RUNS VIEW & TRIGGERS
CREATE OR REPLACE VIEW allocation_runs AS
SELECT
    id,
    academic_year,
    semester,
    campus_id,
    user_id AS triggered_by,
    started_at AS triggered_at,
    status,
    completed_at,
    error_message
FROM system_logs
WHERE log_type = 'allocation_run';

CREATE OR REPLACE FUNCTION trg_insert_allocation_runs()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO system_logs (
        id, log_type, academic_year, semester, campus_id, user_id,
        status, started_at, completed_at, error_message, created_at, updated_at
    ) VALUES (
        COALESCE(NEW.id, gen_random_uuid()),
        'allocation_run',
        NEW.academic_year,
        NEW.semester,
        NEW.campus_id,
        NEW.triggered_by,
        COALESCE(NEW.status, 'running'),
        COALESCE(NEW.triggered_at, timezone('utc'::text, now())),
        NEW.completed_at,
        NEW.error_message,
        COALESCE(NEW.triggered_at, timezone('utc'::text, now())),
        timezone('utc'::text, now())
    )
    RETURNING id INTO NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_allocation_runs_insert ON allocation_runs;
CREATE TRIGGER trg_allocation_runs_insert
INSTEAD OF INSERT ON allocation_runs
FOR EACH ROW EXECUTE FUNCTION trg_insert_allocation_runs();

CREATE OR REPLACE FUNCTION trg_update_allocation_runs()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE system_logs
    SET
        status = COALESCE(NEW.status, status),
        completed_at = COALESCE(NEW.completed_at, completed_at),
        error_message = NEW.error_message,
        updated_at = timezone('utc'::text, now())
    WHERE id = OLD.id AND log_type = 'allocation_run';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_allocation_runs_update ON allocation_runs;
CREATE TRIGGER trg_allocation_runs_update
INSTEAD OF UPDATE ON allocation_runs
FOR EACH ROW EXECUTE FUNCTION trg_update_allocation_runs();


-- C. AUDIT_LOGS VIEW & TRIGGERS
CREATE OR REPLACE VIEW audit_logs AS
SELECT
    id,
    event_type,
    user_id,
    user_role,
    action,
    resource_type,
    resource_id,
    status,
    error_message,
    metadata,
    ip_address,
    user_agent,
    created_at
FROM system_logs
WHERE log_type = 'audit_event';

CREATE OR REPLACE FUNCTION trg_insert_audit_logs()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO system_logs (
        id, log_type, event_type, user_id, user_role, action,
        resource_type, resource_id, status, error_message, metadata,
        ip_address, user_agent, created_at, updated_at
    ) VALUES (
        COALESCE(NEW.id, gen_random_uuid()),
        'audit_event',
        NEW.event_type,
        NEW.user_id,
        NEW.user_role,
        NEW.action,
        NEW.resource_type,
        NEW.resource_id,
        NEW.status,
        NEW.error_message,
        COALESCE(NEW.metadata, '{}'::jsonb),
        NEW.ip_address,
        NEW.user_agent,
        COALESCE(NEW.created_at, timezone('utc'::text, now())),
        COALESCE(NEW.created_at, timezone('utc'::text, now()))
    )
    RETURNING id INTO NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_logs_insert ON audit_logs;
CREATE TRIGGER trg_audit_logs_insert
INSTEAD OF INSERT ON audit_logs
FOR EACH ROW EXECUTE FUNCTION trg_insert_audit_logs();


-- 6. UPDATE RPC FUNCTION FOR ALLOCATION RUN COMPLETION
CREATE OR REPLACE FUNCTION apply_course_allocation(
    p_run_id UUID,
    p_campus_id UUID,
    p_academic_year TEXT,
    p_semester SMALLINT,
    p_allocations JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    item JSONB;
    v_reg_id UUID;
    v_slot_key TEXT;
    v_course_id UUID;
    v_meta JSONB;
    v_sql TEXT;
BEGIN
    -- Step A: Reset elective slots back to NULL for registrations in this campus, academic_year, and semester
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

    -- Step B: Iterate through winning elective allocations and apply them
    FOR item IN SELECT * FROM jsonb_array_elements(p_allocations)
    LOOP
        v_reg_id := (item->>'registration_id')::UUID;
        v_slot_key := item->>'slot_key';
        v_course_id := (item->>'course_id')::UUID;
        v_meta := item->'metadata';

        IF v_slot_key IN ('slot_1', 'slot_2', 'slot_3', 'slot_4', 'slot_5', 'slot_6') THEN
            v_sql := format(
                'UPDATE student_registrations SET %I = $1, allocation_metadata = COALESCE(allocation_metadata, ''{}''::jsonb) || jsonb_build_object($2, $3) WHERE id = $4',
                v_slot_key || '_course_id'
            );
            EXECUTE v_sql USING v_course_id, v_slot_key, v_meta, v_reg_id;
        END IF;
    END LOOP;

    -- Step C: Mark the allocation run as completed in system_logs
    UPDATE system_logs
    SET status = 'completed',
        completed_at = timezone('utc'::text, now()),
        updated_at = timezone('utc'::text, now())
    WHERE id = p_run_id AND log_type = 'allocation_run';

    RETURN jsonb_build_object(
        'success', true,
        'run_id', p_run_id,
        'allocated_count', jsonb_array_length(p_allocations)
    );
END;
$$;


-- 7. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- Admins, Directors, and HODs can view all relevant logs
CREATE POLICY "Admins, Directors, HODs can view system_logs"
    ON system_logs FOR SELECT
    TO authenticated
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('campus_director', 'superadmin', 'hod', 'admin')
        OR (auth.jwt() ->> 'role') IN ('campus_director', 'superadmin', 'hod', 'admin')
        OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('campus_director', 'superadmin', 'hod', 'admin')
        OR user_id = auth.uid()
    );

-- Allow authenticated users & backend service to insert records
CREATE POLICY "Authenticated users can insert system_logs"
    ON system_logs FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Only batch jobs can receive state & progress updates; audit records are strictly immutable
CREATE POLICY "Allow update only on job records in system_logs"
    ON system_logs FOR UPDATE
    TO authenticated
    USING (log_type IN ('timetable_job', 'allocation_run'));
