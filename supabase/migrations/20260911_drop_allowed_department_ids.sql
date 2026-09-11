-- Migration: 20260911_drop_allowed_department_ids.sql
-- Description: Drop allowed_department_ids column from courses table.
-- Department eligibility and matching are unified under the course_prerequisite_rules table (rule = 'DEPARTMENT').

ALTER TABLE courses DROP COLUMN IF EXISTS allowed_department_ids;
