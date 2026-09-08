-- =============================================================================
-- Migration: 20260903_security_and_schema_fixes.sql
-- Description: Implement missing cascade RPCs, schema fixes, and audit indexes.
-- =============================================================================

-- 1. Ensure updated_at column exists on timetable_generation_jobs
ALTER TABLE IF EXISTS timetable_generation_jobs 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- 2. Audit logs indexing for fast threat and event lookups
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type_created ON audit_logs (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id);

-- 3. delete_campus_cascade RPC
DROP FUNCTION IF EXISTS delete_campus_cascade(UUID);
CREATE OR REPLACE FUNCTION delete_campus_cascade(p_campus_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete campus record (FKs with ON DELETE CASCADE will handle child tables)
    DELETE FROM campuses WHERE id = p_campus_id;
END;
$$;

COMMENT ON FUNCTION delete_campus_cascade(UUID) IS 'Deletes a campus and cascades down to affiliated academic entities.';

-- 4. delete_department_cascade RPC
-- Drop first to handle any existing function with a different parameter name (e.g. p_department_id)
DROP FUNCTION IF EXISTS delete_department_cascade(UUID);
CREATE OR REPLACE FUNCTION delete_department_cascade(p_dept_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete department record (FKs with ON DELETE CASCADE will handle courses, blueprints, students)
    DELETE FROM departments WHERE id = p_dept_id;
END;
$$;

COMMENT ON FUNCTION delete_department_cascade(UUID) IS 'Deletes an academic department and cascades to related courses and records.';

-- 5. promote_campus_students RPC
DROP FUNCTION IF EXISTS promote_campus_students(UUID);
CREATE OR REPLACE FUNCTION promote_campus_students(p_campus_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_promoted_count INTEGER := 0;
BEGIN
    -- 1. Remove graduating students (semester 10)
    DELETE FROM students 
    WHERE campus_id = p_campus_id AND current_semester >= 10;

    -- 2. Promote remaining students to the next semester
    WITH updated AS (
        UPDATE students
        SET current_semester = current_semester + 1
        WHERE campus_id = p_campus_id AND current_semester < 10
        RETURNING id
    )
    SELECT COUNT(*) INTO v_promoted_count FROM updated;

    RETURN v_promoted_count;
END;
$$;

COMMENT ON FUNCTION promote_campus_students(UUID) IS 'Promotes enrolled students at a campus to next semester and cleans up graduating students.';
