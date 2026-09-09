-- =============================================================================
-- Migration: 20260909_course_allocation_v2_rules_and_preferences.sql
-- Description: Separate registration_preferences from student_registrations and add course_prerequisite_rules table
-- Target Schema: public
-- =============================================================================

-- 1. CREATE REGISTRATION_PREFERENCES TABLE
CREATE TABLE IF NOT EXISTS registration_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    campus_id UUID NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
    semester SMALLINT NOT NULL,
    academic_year TEXT NOT NULL,
    pathway_id UUID,
    preferences JSONB NOT NULL DEFAULT '[]'::jsonb,
    allocation_metadata JSONB DEFAULT '{}'::jsonb,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_student_pref UNIQUE(student_id, semester, academic_year)
);

COMMENT ON TABLE registration_preferences IS 'Stores student preference submissions and allocation metadata during registration windows.';
COMMENT ON COLUMN registration_preferences.preferences IS 'Unified array of slot objects containing slot number, rule, and ranked choices.';
COMMENT ON COLUMN registration_preferences.allocation_metadata IS 'Allocation resolution outcome per slot (fixed, rank_1/2/3, unallocated, or hod).';
COMMENT ON COLUMN registration_preferences.submitted_at IS 'Frozen on first submission; tie-breaker timestamp for allocation.';

CREATE INDEX IF NOT EXISTS idx_reg_pref_lookup
    ON registration_preferences(campus_id, academic_year, semester);

CREATE INDEX IF NOT EXISTS idx_reg_pref_student
    ON registration_preferences(student_id, semester, academic_year);

-- 2. CREATE COURSE_PREREQUISITE_RULES TABLE
CREATE TABLE IF NOT EXISTS course_prerequisite_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    rule TEXT NOT NULL CHECK (rule IN ('COMPLETED_COURSE', 'COMPLETED_SEMESTER', 'DEPARTMENT')),
    target TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_course_rule_target UNIQUE(course_id, rule, target)
);

COMMENT ON TABLE course_prerequisite_rules IS 'Extensible prerequisite rules for courses scoring +1 point each when matched.';
COMMENT ON COLUMN course_prerequisite_rules.rule IS 'COMPLETED_COURSE (target=course_code), COMPLETED_SEMESTER (target=semester number), or DEPARTMENT (target=dept code).';

CREATE INDEX IF NOT EXISTS idx_course_prereq_rules_course_id
    ON course_prerequisite_rules(course_id);

-- 3. RLS POLICIES FOR NEW TABLES
ALTER TABLE registration_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_prerequisite_rules ENABLE ROW LEVEL SECURITY;

-- Service role / postgres has full access; allow authenticated read
CREATE POLICY "Allow authenticated read on course_prerequisite_rules"
    ON course_prerequisite_rules FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow students read their own registration_preferences"
    ON registration_preferences FOR SELECT
    TO authenticated
    USING (student_id = auth.uid());

-- 4. ATOMIC ALLOCATION APPLICATION RPC FUNCTION (V2)
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
    v_pref_id UUID;
    v_slot_key TEXT;
    v_course_id UUID;
    v_meta JSONB;
    v_sql TEXT;
BEGIN
    -- Step A: Reset elective slots back to NULL for registrations in this cohort
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

    -- Step B: Iterate through the winning elective allocations and apply them to student_registrations and registration_preferences
    FOR item IN SELECT * FROM jsonb_array_elements(p_allocations)
    LOOP
        v_student_id := (item->>'student_id')::UUID;
        v_reg_id := (item->>'registration_id')::UUID;
        v_pref_id := (item->>'preference_id')::UUID;
        v_slot_key := item->>'slot_key';
        v_course_id := (item->>'course_id')::UUID;
        v_meta := item->'metadata';

        IF v_slot_key IN ('slot_1', 'slot_2', 'slot_3', 'slot_4', 'slot_5', 'slot_6') THEN
            -- Ensure student_registrations record exists and assign course
            IF v_reg_id IS NOT NULL THEN
                v_sql := format(
                    'UPDATE student_registrations SET %I = $1, allocation_metadata = COALESCE(allocation_metadata, ''{}''::jsonb) || jsonb_build_object($2, $3) WHERE id = $4',
                    v_slot_key || '_course_id'
                );
                EXECUTE v_sql USING v_course_id, v_slot_key, v_meta, v_reg_id;
            ELSIF v_student_id IS NOT NULL THEN
                v_sql := format(
                    'UPDATE student_registrations SET %I = $1, allocation_metadata = COALESCE(allocation_metadata, ''{}''::jsonb) || jsonb_build_object($2, $3) WHERE student_id = $4 AND semester = $5 AND academic_year = $6',
                    v_slot_key || '_course_id'
                );
                EXECUTE v_sql USING v_course_id, v_slot_key, v_meta, v_student_id, p_semester, p_academic_year;
            END IF;

            -- Update registration_preferences allocation_metadata
            IF v_pref_id IS NOT NULL THEN
                UPDATE registration_preferences
                SET allocation_metadata = COALESCE(allocation_metadata, '{}'::jsonb) || jsonb_build_object(v_slot_key, v_meta),
                    updated_at = timezone('utc'::text, now())
                WHERE id = v_pref_id;
            ELSIF v_student_id IS NOT NULL THEN
                UPDATE registration_preferences
                SET allocation_metadata = COALESCE(allocation_metadata, '{}'::jsonb) || jsonb_build_object(v_slot_key, v_meta),
                    updated_at = timezone('utc'::text, now())
                WHERE student_id = v_student_id AND semester = p_semester AND academic_year = p_academic_year;
            END IF;
        END IF;
    END LOOP;

    -- Step C: Update unallocated slots in registration_preferences
    FOR item IN SELECT * FROM jsonb_array_elements(p_unallocated)
    LOOP
        v_student_id := (item->>'student_id')::UUID;
        v_pref_id := (item->>'preference_id')::UUID;
        v_slot_key := item->>'slot_key';
        v_meta := item->'metadata';

        IF v_pref_id IS NOT NULL THEN
            UPDATE registration_preferences
            SET allocation_metadata = COALESCE(allocation_metadata, '{}'::jsonb) || jsonb_build_object(v_slot_key, v_meta),
                updated_at = timezone('utc'::text, now())
            WHERE id = v_pref_id;
        ELSIF v_student_id IS NOT NULL THEN
            UPDATE registration_preferences
            SET allocation_metadata = COALESCE(allocation_metadata, '{}'::jsonb) || jsonb_build_object(v_slot_key, v_meta),
                updated_at = timezone('utc'::text, now())
            WHERE student_id = v_student_id AND semester = p_semester AND academic_year = p_academic_year;
        END IF;
    END LOOP;

    -- Step D: Mark the allocation run as completed
    UPDATE allocation_runs
    SET status = 'completed',
        completed_at = timezone('utc'::text, now())
    WHERE id = p_run_id;

    RETURN jsonb_build_object(
        'success', true,
        'run_id', p_run_id,
        'allocated_count', jsonb_array_length(p_allocations),
        'unallocated_count', jsonb_array_length(p_unallocated)
    );
END;
$$;
