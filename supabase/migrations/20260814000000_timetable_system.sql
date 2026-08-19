-- Migration: FYIMP Timetable Generation System

-- 1. Alter courses table to add missing columns if they don't exist
ALTER TABLE courses ADD COLUMN IF NOT EXISTS hours_per_week int;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_lab boolean DEFAULT false;

UPDATE courses SET hours_per_week = COALESCE(hours_per_week, credits, 3) WHERE hours_per_week IS NULL;
UPDATE courses SET is_lab = false WHERE is_lab IS NULL;

ALTER TABLE courses ALTER COLUMN hours_per_week SET NOT NULL;
ALTER TABLE courses ALTER COLUMN hours_per_week SET DEFAULT 3;
ALTER TABLE courses ALTER COLUMN is_lab SET NOT NULL;
ALTER TABLE courses ALTER COLUMN is_lab SET DEFAULT false;

-- 2. Registration windows
CREATE TABLE IF NOT EXISTS registration_windows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year text NOT NULL,
  semester smallint NOT NULL,
  campus_id uuid,
  is_closed boolean NOT NULL DEFAULT false,
  closed_at timestamptz,
  UNIQUE (academic_year, semester)
);

-- 3. Time slot definitions
CREATE TABLE IF NOT EXISTS time_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 1 AND 5), -- 1=Mon
  period_number smallint NOT NULL CHECK (period_number BETWEEN 1 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_lab_block boolean NOT NULL DEFAULT false,
  lab_pair_with uuid REFERENCES time_slots(id),
  UNIQUE (day_of_week, period_number)
);

-- 4. Timetable entries
CREATE TABLE IF NOT EXISTS timetable_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year text NOT NULL,
  semester smallint NOT NULL,
  course_id uuid NOT NULL REFERENCES courses(id),
  department_id uuid NOT NULL REFERENCES departments(id),
  time_slot_id uuid NOT NULL REFERENCES time_slots(id),
  is_lab_block boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','published','conflict')),
  generated_by uuid REFERENCES auth.users(id),
  generated_at timestamptz,
  CONSTRAINT timetable_entries_unique UNIQUE (academic_year, semester, course_id, time_slot_id, department_id)
);

-- 5. Conflict log
CREATE TABLE IF NOT EXISTS timetable_conflicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year text NOT NULL,
  semester smallint NOT NULL,
  course_id uuid NOT NULL REFERENCES courses(id),
  blocking_course_id uuid REFERENCES courses(id),
  reason text NOT NULL,
  conflicting_student_count int,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 6. Generation job state
CREATE TABLE IF NOT EXISTS timetable_generation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year text NOT NULL,
  semester smallint NOT NULL,
  campus_id uuid,
  status text NOT NULL DEFAULT 'queued'
                CHECK (status IN ('queued','running','completed','failed')),
  progress smallint DEFAULT 0,
  error_message text,
  triggered_by uuid REFERENCES auth.users(id),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Seed time_slots immediately
DO $$
DECLARE
  days int[] := ARRAY[1,2,3,4,5];
  d int;
BEGIN
  FOREACH d IN ARRAY days LOOP
    INSERT INTO time_slots (day_of_week, period_number, start_time, end_time)
    VALUES
      (d, 1, '09:30', '10:30'),
      (d, 2, '10:30', '11:30'),
      (d, 3, '11:30', '12:30'),
      (d, 4, '13:30', '14:30'),
      (d, 5, '14:30', '15:30'),
      (d, 6, '15:30', '16:30')
    ON CONFLICT (day_of_week, period_number) DO NOTHING;
  END LOOP;
END $$;

-- Enable RLS
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_windows ENABLE ROW LEVEL SECURITY;

-- RLS policies
DO $$ BEGIN
  -- 1. Time slots: Read for all authenticated
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow read access to time_slots for authenticated users') THEN
    CREATE POLICY "Allow read access to time_slots for authenticated users"
      ON time_slots FOR SELECT TO authenticated USING (true);
  END IF;

  -- 2. Timetable entries: Read for all authenticated, Write for directors & superadmins
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow read access to timetable_entries for authenticated users') THEN
    CREATE POLICY "Allow read access to timetable_entries for authenticated users"
      ON timetable_entries FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow write access to timetable_entries for directors and superadmins') THEN
    CREATE POLICY "Allow write access to timetable_entries for directors and superadmins"
      ON timetable_entries FOR ALL TO authenticated
      USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('campus_director', 'superadmin')
        OR (auth.jwt() ->> 'role') IN ('campus_director', 'superadmin')
        OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('campus_director', 'superadmin')
      );
  END IF;

  -- 3. Generation jobs: Read for authenticated, Write for directors & superadmins
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow read access to timetable_generation_jobs for authenticated users') THEN
    CREATE POLICY "Allow read access to timetable_generation_jobs for authenticated users"
      ON timetable_generation_jobs FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow write access to timetable_generation_jobs for directors and superadmins') THEN
    CREATE POLICY "Allow write access to timetable_generation_jobs for directors and superadmins"
      ON timetable_generation_jobs FOR ALL TO authenticated
      USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('campus_director', 'superadmin')
        OR (auth.jwt() ->> 'role') IN ('campus_director', 'superadmin')
        OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('campus_director', 'superadmin')
      );
  END IF;

  -- 4. Conflicts: Read for authenticated, Write for directors & superadmins
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow read access to timetable_conflicts for authenticated users') THEN
    CREATE POLICY "Allow read access to timetable_conflicts for authenticated users"
      ON timetable_conflicts FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow write access to timetable_conflicts for directors and superadmins') THEN
    CREATE POLICY "Allow write access to timetable_conflicts for directors and superadmins"
      ON timetable_conflicts FOR ALL TO authenticated
      USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('campus_director', 'superadmin')
        OR (auth.jwt() ->> 'role') IN ('campus_director', 'superadmin')
        OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('campus_director', 'superadmin')
      );
  END IF;

  -- 5. Registration windows: Read for authenticated, Write for directors & superadmins
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow read access to registration_windows for authenticated users') THEN
    CREATE POLICY "Allow read access to registration_windows for authenticated users"
      ON registration_windows FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow write access to registration_windows for directors and superadmins') THEN
    CREATE POLICY "Allow write access to registration_windows for directors and superadmins"
      ON registration_windows FOR ALL TO authenticated
      USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('campus_director', 'superadmin')
        OR (auth.jwt() ->> 'role') IN ('campus_director', 'superadmin')
        OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('campus_director', 'superadmin')
      );
  END IF;
END $$;
