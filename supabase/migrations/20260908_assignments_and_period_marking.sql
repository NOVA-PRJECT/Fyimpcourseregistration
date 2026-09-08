-- =============================================================================
-- Migration: 20260908_assignments_and_period_marking.sql
-- Description: Teacher-Course Assignments and Period-Level Attendance Tracking
-- Target Schema: public
-- =============================================================================

-- 1. TEACHER_COURSE_ASSIGNMENTS TABLE
CREATE TABLE IF NOT EXISTS teacher_course_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT teacher_course_assignments_unique UNIQUE (teacher_id, course_id)
);

COMMENT ON TABLE teacher_course_assignments IS 'Faculty assigned to instruct courses within a department.';

CREATE INDEX IF NOT EXISTS idx_tca_course_id ON teacher_course_assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_tca_teacher_id ON teacher_course_assignments(teacher_id);

-- 2. PERIOD_ATTENDANCE TABLE
CREATE TABLE IF NOT EXISTS period_attendance (
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

COMMENT ON TABLE period_attendance IS 'Period-level lecture attendance marks recorded per student.';

CREATE INDEX IF NOT EXISTS idx_period_att_slot_id ON period_attendance(timetable_slot_id);
CREATE INDEX IF NOT EXISTS idx_period_att_student_id ON period_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_period_att_course_id ON period_attendance(course_id);

-- 3. PERIOD_UNLOCK_REQUESTS TABLE
CREATE TABLE IF NOT EXISTS period_unlock_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timetable_slot_id UUID NOT NULL REFERENCES timetable_entries(id) ON DELETE CASCADE,
    unlocked_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    reason TEXT NOT NULL
);

COMMENT ON TABLE period_unlock_requests IS 'HOD authorization audit log allowing period marking beyond standard grace windows.';

CREATE INDEX IF NOT EXISTS idx_period_unlock_slot_id ON period_unlock_requests(timetable_slot_id);

-- Row Level Security
ALTER TABLE teacher_course_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE period_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE period_unlock_requests ENABLE ROW LEVEL SECURITY;

-- Assignments RLS: All authenticated users can read; HODs/Admins can write
CREATE POLICY "Allow read assignments for authenticated users"
    ON teacher_course_assignments FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Allow write assignments for HODs and Admins"
    ON teacher_course_assignments FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM faculty WHERE id = auth.uid() AND role = 'hod')
        OR EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM faculty WHERE id = auth.uid() AND role = 'hod')
        OR EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
    );

-- Period Attendance RLS: Students can view own marks; Faculty can mark; HODs/Admins can view
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

-- Unlock Requests RLS: HODs and Admins can create and view
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
