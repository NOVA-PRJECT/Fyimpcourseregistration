-- =============================================================================
-- Migration: 20260908_consent_records.sql
-- Description: Privacy & Consent records table for versioned audit logging
-- Target Schema: public
-- =============================================================================

CREATE TABLE IF NOT EXISTS consent_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    policy_version TEXT NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE consent_records IS 'Immutable append-only audit trail of user acceptances for Privacy Policy and Terms versions.';

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_consent_records_user_id ON consent_records(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_records_user_policy ON consent_records(user_id, policy_version, accepted_at DESC);

-- Row Level Security (RLS)
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own consent audit trail
CREATE POLICY "Users can view their own consent records"
    ON consent_records FOR SELECT
    USING (auth.uid() = user_id);

-- Allow authenticated users to insert a new consent record for themselves
CREATE POLICY "Users can insert their own consent records"
    ON consent_records FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Admins can view all consent records for regulatory compliance
CREATE POLICY "Admins can view all consent records"
    ON consent_records FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM admins WHERE id = auth.uid()
        )
    );

-- Strictly disallow UPDATE and DELETE to guarantee immutable audit trail
-- (No policies created for UPDATE or DELETE, effectively rejecting them)
