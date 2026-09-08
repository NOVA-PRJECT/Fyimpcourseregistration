-- =============================================================================
-- Migration: 20260908_campus_attendance.sql
-- Description: Campus-level GPS Attendance Verification & Timing Governance
-- Target Schema: public
-- =============================================================================

-- 1. EXTEND CAMPUSES TABLE WITH GEOFENCE & SCHEDULE CUTOFFS
ALTER TABLE campuses
    ADD COLUMN IF NOT EXISTS center_latitude NUMERIC,
    ADD COLUMN IF NOT EXISTS center_longitude NUMERIC,
    ADD COLUMN IF NOT EXISTS radius_meters INTEGER DEFAULT 400,
    ADD COLUMN IF NOT EXISTS morning_cutoff_time TIME DEFAULT '09:30:00',
    ADD COLUMN IF NOT EXISTS midday_split_time TIME DEFAULT '13:30:00',
    ADD COLUMN IF NOT EXISTS evening_cutoff_time TIME DEFAULT '15:30:00',
    ADD COLUMN IF NOT EXISTS day_end_time TIME DEFAULT '17:00:00';

COMMENT ON COLUMN campuses.center_latitude IS 'Latitude of campus geofence center (WGS84).';
COMMENT ON COLUMN campuses.center_longitude IS 'Longitude of campus geofence center (WGS84).';
COMMENT ON COLUMN campuses.radius_meters IS 'Geofence radius in meters for sign-in validation.';
COMMENT ON COLUMN campuses.morning_cutoff_time IS 'Morning arrival boundary: <= is on_time, > is late.';
COMMENT ON COLUMN campuses.midday_split_time IS 'Boundary between morning/evening sessions and morning window close.';
COMMENT ON COLUMN campuses.evening_cutoff_time IS 'Evening departure boundary: < is early_leave, >= is on_time.';
COMMENT ON COLUMN campuses.day_end_time IS 'Evening window close; sign-ins past this are rejected.';

-- 2. CREATE CAMPUS_SIGN_INS TABLE (ZERO COORDINATE RETENTION)
CREATE TABLE IF NOT EXISTS campus_sign_ins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    campus_id UUID NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
    session_type TEXT NOT NULL CHECK (session_type IN ('morning', 'evening')),
    signed_in_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    signed_in_date DATE GENERATED ALWAYS AS ((signed_in_at AT TIME ZONE 'Asia/Kolkata')::date) STORED,
    location_accuracy_meters NUMERIC NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('on_time', 'late', 'early_leave')),
    source TEXT NOT NULL DEFAULT 'gps' CHECK (source IN ('gps', 'manual_staff')),
    CONSTRAINT campus_sign_ins_unique UNIQUE (student_id, campus_id, signed_in_date, session_type)
);

COMMENT ON TABLE campus_sign_ins IS 'Twice-daily campus physical arrival and departure records. Raw GPS coordinates are discarded immediately after geofence calculation.';

CREATE INDEX IF NOT EXISTS idx_csi_student_date ON campus_sign_ins(student_id, signed_in_date);
CREATE INDEX IF NOT EXISTS idx_csi_campus_date ON campus_sign_ins(campus_id, signed_in_date);

-- 3. ROW LEVEL SECURITY (RLS)
ALTER TABLE campus_sign_ins ENABLE ROW LEVEL SECURITY;

-- Students can read their own sign-in logs
CREATE POLICY "Students can view own campus sign-in records"
    ON campus_sign_ins FOR SELECT
    TO authenticated
    USING (
        student_id = auth.uid()
    );

-- Students can insert their own sign-ins (also guarded by NestJS API)
CREATE POLICY "Students can insert own campus sign-in records"
    ON campus_sign_ins FOR INSERT
    TO authenticated
    WITH CHECK (
        student_id = auth.uid()
    );

-- HODs can view sign-ins of students within their department
CREATE POLICY "HODs can view department campus sign-in records"
    ON campus_sign_ins FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM faculty f
            JOIN students s ON s.department_id = f.department_id
            WHERE f.id = auth.uid()
              AND f.role = 'hod'
              AND s.id = campus_sign_ins.student_id
        )
    );

-- Campus Directors and Superadmins have full visibility
CREATE POLICY "Admins and Directors can view all campus sign-in records"
    ON campus_sign_ins FOR ALL
    TO authenticated
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('campus_director', 'superadmin')
        OR (auth.jwt() ->> 'role') IN ('campus_director', 'superadmin')
        OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('campus_director', 'superadmin')
    );
