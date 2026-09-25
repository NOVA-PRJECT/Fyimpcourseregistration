-- =============================================================================
-- Migration: 20260924_fix_consent_rls_policy.sql
-- Description: Correct consent_records Row-Level Security policy to match the
--              actual column name (user_id) instead of student_id.
-- =============================================================================

-- Ensure RLS is active on consent_records
ALTER TABLE IF EXISTS consent_records ENABLE ROW LEVEL SECURITY;

-- Drop mismatched policies that referenced non-existent student_id column
DROP POLICY IF EXISTS consent_select_own ON consent_records;
DROP POLICY IF EXISTS consent_insert_own ON consent_records;

-- Recreate policies with correct user_id reference
CREATE POLICY consent_select_own ON consent_records 
    FOR SELECT TO authenticated 
    USING (user_id = auth.uid());

CREATE POLICY consent_insert_own ON consent_records 
    FOR INSERT TO authenticated 
    WITH CHECK (user_id = auth.uid());

COMMENT ON POLICY consent_select_own ON consent_records IS 
    'Allows authenticated users to view their own consent records by matching user_id with auth.uid()';

COMMENT ON POLICY consent_insert_own ON consent_records IS 
    'Allows authenticated users to record their own policy consent by ensuring user_id equals auth.uid()';
