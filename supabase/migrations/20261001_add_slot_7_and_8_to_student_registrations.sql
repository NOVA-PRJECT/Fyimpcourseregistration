-- =============================================================================
-- Migration: 20261001_add_slot_7_and_8_to_student_registrations.sql
-- Description:
--   Adds slot_7_course_id and slot_8_course_id to student_registrations to support
--   optional papers (up to 8 papers max) for students choosing Minor courses.
-- =============================================================================

ALTER TABLE student_registrations
  ADD COLUMN IF NOT EXISTS slot_7_course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS slot_8_course_id UUID REFERENCES courses(id) ON DELETE SET NULL;

-- Record migration in schema_migrations if table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'schema_migrations'
  ) THEN
    INSERT INTO schema_migrations (version, name)
    VALUES ('20261001_add_slot_7_and_8_to_student_registrations', 'Add slot_7_course_id and slot_8_course_id to student_registrations')
    ON CONFLICT (version) DO NOTHING;
  END IF;
END $$;
