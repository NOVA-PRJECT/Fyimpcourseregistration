-- =============================================================================
-- Migration: 20260908_course_allocation_system.sql
-- Description: Course Allocation Redesign (Scored 3-Round System & Capacity Constraints)
-- Target Schema: public
-- =============================================================================

-- 1. ADD COLUMNS TO COURSES
ALTER TABLE courses
    ADD COLUMN IF NOT EXISTS seat_limit INTEGER DEFAULT 60 CHECK (seat_limit IS NULL OR seat_limit > 0),
    ADD COLUMN IF NOT EXISTS prerequisite_course_ids UUID[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS allowed_department_ids UUID[] DEFAULT '{}';

COMMENT ON COLUMN courses.seat_limit IS 'Total seat capacity across fixed and elective students combined.';
COMMENT ON COLUMN courses.prerequisite_course_ids IS 'List of prior course IDs that earn +1 scoring point each during allocation.';
COMMENT ON COLUMN courses.allowed_department_ids IS 'List of department IDs eligible for registration. Empty array means all departments allowed.';

-- 2. ADD PREFERENCES AND ALLOCATION METADATA TO STUDENT_REGISTRATIONS
ALTER TABLE student_registrations
    ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS allocation_metadata JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN student_registrations.preferences IS 'Student ranked elective preferences per slot (up to 3 ranked choices).';
COMMENT ON COLUMN student_registrations.allocation_metadata IS 'Resolution metadata for each slot (fixed, algorithm with run_id, or hod).';

-- 3. CREATE ALLOCATION_RUNS TABLE
CREATE TABLE IF NOT EXISTS allocation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year TEXT NOT NULL,
    semester SMALLINT NOT NULL,
    campus_id UUID NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
    triggered_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
);

COMMENT ON TABLE allocation_runs IS 'Tracks Campus Director-triggered course allocation batch executions.';

CREATE INDEX IF NOT EXISTS idx_allocation_runs_lookup
    ON allocation_runs(campus_id, academic_year, semester, triggered_at DESC);

-- 4. ATOMIC ALLOCATION APPLICATION RPC FUNCTION
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
    -- Step A: Reset all elective slots back to NULL for registrations in this campus, academic_year, and semester
    -- Fixed slots (where allocation_metadata->slot_key->>'allocated_by' = 'fixed') are preserved
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

    -- Step B: Iterate through the winning elective allocations and apply them
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

    -- Step C: Mark the allocation run as completed
    UPDATE allocation_runs
    SET status = 'completed',
        completed_at = timezone('utc'::text, now())
    WHERE id = p_run_id;

    RETURN jsonb_build_object(
        'success', true,
        'run_id', p_run_id,
        'allocated_count', jsonb_array_length(p_allocations)
    );
END;
$$;
