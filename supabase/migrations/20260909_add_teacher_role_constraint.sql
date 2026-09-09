-- Migration: Add 'teacher' to faculty_role_check constraint
-- Enables distinct 'teacher' role for individual course teachers alongside general 'teaching_staff'

ALTER TABLE faculty DROP CONSTRAINT IF EXISTS faculty_role_check;

ALTER TABLE faculty ADD CONSTRAINT faculty_role_check
  CHECK (role IN ('hod', 'campus_director', 'teaching_staff', 'teacher'));
