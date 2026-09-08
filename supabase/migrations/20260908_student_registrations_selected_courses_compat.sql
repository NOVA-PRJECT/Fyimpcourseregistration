-- =============================================================================
-- Migration: 20260908_student_registrations_selected_courses_compat.sql
-- Description: Adds selected_courses JSONB column to student_registrations as a
--              backward-compatible column to prevent schema cache misses.
-- Target Schema: public
-- =============================================================================

ALTER TABLE student_registrations
    ADD COLUMN IF NOT EXISTS selected_courses JSONB;

COMMENT ON COLUMN student_registrations.selected_courses IS 'Snapshot of evaluated courses for legacy query compatibility.';
