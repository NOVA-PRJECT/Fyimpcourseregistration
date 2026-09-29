-- =============================================================================
-- Migration: 20260929_fix_total_credits_constraint_and_audit_logs.sql
-- Description: 
--   1. Relaxes student_registrations_total_credits_check to CHECK (total_credits >= 0)
--      allowing in-progress, partial, and elective allocation credit states.
--   2. Recreates audit_logs view and trigger to support user_agent column.
-- =============================================================================

-- 1. Fix student_registrations_total_credits_check constraint
DO $$
BEGIN
    -- Drop legacy constraint (e.g. CHECK (total_credits BETWEEN 18 AND 26) or CHECK (total_credits >= 18))
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = 'public' 
          AND table_name = 'student_registrations'
          AND constraint_name = 'student_registrations_total_credits_check'
    ) THEN
        ALTER TABLE student_registrations DROP CONSTRAINT student_registrations_total_credits_check;
    END IF;

    -- Add relaxed constraint that accommodates partial/multi-round allocations
    ALTER TABLE student_registrations 
        ADD CONSTRAINT student_registrations_total_credits_check CHECK (total_credits >= 0);
END $$;

-- 2. Upgrade audit_logs view and trigger to include user_agent column
DROP TRIGGER IF EXISTS trg_audit_logs_insert ON audit_logs;
DROP VIEW IF EXISTS audit_logs_legacy CASCADE;
DROP VIEW IF EXISTS audit_logs CASCADE;

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

CREATE OR REPLACE VIEW audit_logs_legacy AS SELECT * FROM audit_logs;

-- Recreate trigger function supporting user_agent
CREATE OR REPLACE FUNCTION trg_audit_logs_io()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO system_logs (
            id, log_type, event_type, user_id, user_role, action,
            resource_type, resource_id, status, error_message,
            metadata, ip_address, user_agent, created_at, updated_at
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
            timezone('utc'::text, now())
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_audit_logs_insert
INSTEAD OF INSERT ON audit_logs
FOR EACH ROW EXECUTE FUNCTION trg_audit_logs_io();

-- 3. Record migration in schema_migrations
INSERT INTO schema_migrations (version, name)
VALUES ('20260929_fix_total_credits_constraint_and_audit_logs', 'Relax total_credits check and add user_agent to audit_logs view')
ON CONFLICT (version) DO NOTHING;
