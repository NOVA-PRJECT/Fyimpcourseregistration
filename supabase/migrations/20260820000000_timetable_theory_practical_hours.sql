-- Step 1: Add new columns as nullable
ALTER TABLE courses
ADD COLUMN theory_hours_per_week smallint,
ADD COLUMN practical_hours_per_week smallint NOT NULL DEFAULT 0;

-- Step 2: Backfill theory_hours from existing hours_per_week
-- For courses that were is_lab=true, move hours to practical
UPDATE courses
SET
  theory_hours_per_week = CASE WHEN is_lab = false THEN hours_per_week ELSE 0 END,
  practical_hours_per_week = CASE WHEN is_lab = true THEN hours_per_week ELSE 0 END;

-- Step 3: Set NOT NULL now that backfill is done
ALTER TABLE courses
ALTER COLUMN theory_hours_per_week SET NOT NULL,
ALTER COLUMN theory_hours_per_week SET DEFAULT 0;

-- Step 4: Drop old columns
ALTER TABLE courses
DROP COLUMN hours_per_week,
DROP COLUMN is_lab;

-- Step 5: Add session_type to timetable_entries
-- This lets the timetable grid distinguish theory vs practical slots
ALTER TABLE timetable_entries
ADD COLUMN session_type text NOT NULL DEFAULT 'theory'
CHECK (session_type IN ('theory', 'practical'));
