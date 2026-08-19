-- Drop old unique constraint
ALTER TABLE timetable_entries
DROP CONSTRAINT IF EXISTS timetable_entries_academic_year_semester_course_id_time_slo_key;

-- Add new constraint that includes department_id
ALTER TABLE timetable_entries
ADD CONSTRAINT timetable_entries_unique
UNIQUE (academic_year, semester, course_id, time_slot_id, department_id);
