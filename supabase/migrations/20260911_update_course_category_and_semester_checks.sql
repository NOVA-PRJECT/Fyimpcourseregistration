-- Migration: 20260911_update_course_category_and_semester_checks.sql
-- Description: Expand courses category check constraint to allow all 12 FYIMP categories:
--              'DSS', 'DSC', 'DSE', 'VAC', 'SEC', 'MDC', 'MOOC', 'AEC', 'INT', 'FWD', 'RPH', 'CIP'
--              and expand semester check constraint to 10 semesters (1 to 10).

-- 1. Drop existing category check constraint if present
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_category_check;

-- 2. Add updated category check constraint with all 12 FYIMP categories
ALTER TABLE courses ADD CONSTRAINT courses_category_check
    CHECK (category IN ('DSS', 'DSC', 'DSE', 'VAC', 'SEC', 'MDC', 'MOOC', 'AEC', 'INT', 'FWD', 'RPH', 'CIP'));

-- 3. Drop existing semester check constraint if present
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_semester_check;

-- 4. Add updated semester check constraint supporting all 10 semesters
ALTER TABLE courses ADD CONSTRAINT courses_semester_check
    CHECK (semester BETWEEN 1 AND 10);
