-- =============================================================================
-- FYIMP: CREATE TIMETABLE TABLES & SEED DEFAULT SLOTS
-- Run this directly in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- =============================================================================

-- 1. TIME SLOTS TABLE
CREATE TABLE IF NOT EXISTS time_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 6),
    period_number SMALLINT NOT NULL CHECK (period_number BETWEEN 1 AND 10),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_lab_block BOOLEAN NOT NULL DEFAULT false,
    lab_pair_with UUID REFERENCES time_slots(id) ON DELETE SET NULL,
    UNIQUE(day_of_week, period_number)
);

-- 2. TIMETABLE ENTRIES TABLE (Main Timetable Table)
CREATE TABLE IF NOT EXISTS timetable_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year TEXT NOT NULL,
    semester SMALLINT NOT NULL,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    time_slot_id UUID NOT NULL REFERENCES time_slots(id) ON DELETE CASCADE,
    is_lab_block BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'published')),
    session_type TEXT DEFAULT 'theory',
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT timetable_entries_unique UNIQUE (academic_year, semester, course_id, time_slot_id, department_id)
);

-- 3. TIMETABLE CONFLICTS TABLE
CREATE TABLE IF NOT EXISTS timetable_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year TEXT NOT NULL,
    semester SMALLINT NOT NULL,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    blocking_course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    conflicting_student_count INTEGER DEFAULT 0,
    resolved BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. TIMETABLE GENERATION JOBS TABLE
-- Drop legacy compatibility view if it exists so table can be created cleanly
DROP VIEW IF EXISTS timetable_generation_jobs CASCADE;
DROP VIEW IF EXISTS timetable_generation_jobs_legacy CASCADE;

CREATE TABLE IF NOT EXISTS timetable_generation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year TEXT NOT NULL,
    semester SMALLINT NOT NULL,
    campus_id UUID REFERENCES campuses(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('idle', 'queued', 'running', 'completed', 'failed')),
    progress SMALLINT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    triggered_by UUID,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    step_message TEXT,
    error_message TEXT,
    constraints_used JSONB,
    stats JSONB,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. CREATE INDEXES FOR FAST QUERYING
CREATE INDEX IF NOT EXISTS idx_timetable_entries_course_id ON timetable_entries(course_id);
CREATE INDEX IF NOT EXISTS idx_timetable_entries_department_id ON timetable_entries(department_id);
CREATE INDEX IF NOT EXISTS idx_timetable_entries_time_slot_id ON timetable_entries(time_slot_id);
CREATE INDEX IF NOT EXISTS idx_timetable_entries_status ON timetable_entries(status);
CREATE INDEX IF NOT EXISTS idx_timetable_entries_year_sem ON timetable_entries(academic_year, semester);

-- 6. ENABLE ROW LEVEL SECURITY (RLS) & POLICIES
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_generation_jobs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'time_slots' AND policyname = 'Allow read access to time_slots for authenticated users') THEN
    CREATE POLICY "Allow read access to time_slots for authenticated users"
      ON time_slots FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'timetable_entries' AND policyname = 'Allow read access to timetable_entries for authenticated users') THEN
    CREATE POLICY "Allow read access to timetable_entries for authenticated users"
      ON timetable_entries FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'timetable_entries' AND policyname = 'Allow write access to timetable_entries for authenticated users') THEN
    CREATE POLICY "Allow write access to timetable_entries for authenticated users"
      ON timetable_entries FOR ALL TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'timetable_conflicts' AND policyname = 'Allow read access to timetable_conflicts for authenticated users') THEN
    CREATE POLICY "Allow read access to timetable_conflicts for authenticated users"
      ON timetable_conflicts FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'timetable_generation_jobs' AND policyname = 'Allow all access to timetable_generation_jobs for authenticated users') THEN
    CREATE POLICY "Allow all access to timetable_generation_jobs for authenticated users"
      ON timetable_generation_jobs FOR ALL TO authenticated USING (true);
  END IF;
END;
$$;

-- 7. SEED DEFAULT 30 TIME SLOTS (Period 1 to 6 for Monday to Friday)
DO $$
DECLARE
    d smallint;
    p smallint;
    st time;
    et time;
    start_times time[] := ARRAY['09:30:00'::time, '10:30:00'::time, '11:30:00'::time, '13:30:00'::time, '14:30:00'::time, '15:30:00'::time];
    end_times   time[] := ARRAY['10:30:00'::time, '11:30:00'::time, '12:30:00'::time, '14:30:00'::time, '15:30:00'::time, '16:30:00'::time];
BEGIN
    FOR d IN 1..5 LOOP
        FOR p IN 1..6 LOOP
            st := start_times[p];
            et := end_times[p];
            INSERT INTO time_slots (day_of_week, period_number, start_time, end_time, is_lab_block)
            VALUES (d, p, st, et, false)
            ON CONFLICT (day_of_week, period_number) DO UPDATE
            SET start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time;
        END LOOP;
    END LOOP;
END;
$$;
