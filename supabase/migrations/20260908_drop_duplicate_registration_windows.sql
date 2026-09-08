-- =============================================================================
-- Migration: Drop Redundant registration_windows Table
-- Consolidates all registration deadlines & lifecycle state into campus_settings.
-- =============================================================================

-- 1. Drop the table and any associated policies/indexes
DROP TABLE IF EXISTS public.registration_windows CASCADE;

-- 2. Record migration in schema_migrations if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'schema_migrations') THEN
    INSERT INTO schema_migrations (version, name, applied_at)
    VALUES ('20260908_drop_duplicate_registration_windows', 'Drop duplicate registration_windows table', NOW())
    ON CONFLICT (version) DO NOTHING;
  END IF;
END $$;
