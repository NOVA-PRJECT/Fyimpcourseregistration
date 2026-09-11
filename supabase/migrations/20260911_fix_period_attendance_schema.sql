-- =============================================================================
-- Migration: 20260911_fix_period_attendance_schema.sql
-- Description: Drop and recreate period_attendance & period_unlock_requests
--              with the correct schema using timetable_slot_id references.
--              The original tables from FULL_CLEAN_SETUP used date+period_number
--              which is incompatible with the new timetable-based attendance system.
-- =============================================================================

-- 1. Drop old tables (CASCADE removes dependent indexes, constraints, policies)
DROP TABLE IF EXISTS period_attendance CASCADE;
DROP TABLE IF EXISTS period_unlock_requests CASCADE;

-- 2. Recreate PERIOD_ATTENDANCE with timetable_slot_id
CREATE TABLE period_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timetable_slot_id UUID NOT NULL REFERENCES timetable_entries(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    marked_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent')),
    marked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    is_late_entry BOOLEAN NOT NULL DEFAULT false,
    unlocked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    CONSTRAINT period_attendance_unique UNIQUE (timetable_slot_id, student_id)
);

COMMENT ON TABLE period_attendance IS 'Period-level lecture attendance marks recorded per student per timetable slot.';

CREATE INDEX IF NOT EXISTS idx_period_att_slot_id ON period_attendance(timetable_slot_id);
CREATE INDEX IF NOT EXISTS idx_period_att_student_id ON period_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_period_att_course_id ON period_attendance(course_id);

-- 3. Recreate PERIOD_UNLOCK_REQUESTS with timetable_slot_id
CREATE TABLE period_unlock_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timetable_slot_id UUID NOT NULL REFERENCES timetable_entries(id) ON DELETE CASCADE,
    unlocked_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    reason TEXT NOT NULL
);

COMMENT ON TABLE period_unlock_requests IS 'HOD authorization audit log allowing period marking beyond standard grace windows.';

CREATE INDEX IF NOT EXISTS idx_period_unlock_slot_id ON period_unlock_requests(timetable_slot_id);

-- 4. Enable RLS
ALTER TABLE period_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE period_unlock_requests ENABLE ROW LEVEL SECURITY;

-- 5. Period Attendance RLS Policies
CREATE POLICY "Students can view own period attendance"
    ON period_attendance FOR SELECT TO authenticated
    USING (student_id = auth.uid());

CREATE POLICY "Faculty can mark period attendance"
    ON period_attendance FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM faculty WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM faculty WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
    );

-- 6. Unlock Requests RLS Policies
CREATE POLICY "Allow HODs and Admins to manage unlock requests"
    ON period_unlock_requests FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM faculty WHERE id = auth.uid() AND role = 'hod')
        OR EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM faculty WHERE id = auth.uid() AND role = 'hod')
        OR EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
    );
