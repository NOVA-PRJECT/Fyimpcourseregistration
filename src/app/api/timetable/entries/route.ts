import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/core/database/supabaseClient';
import { TimetableQuerySchema } from '@/lib/timetable/schemas';
import { verifyDirector } from '@/core/auth/verifyRole';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = claimsData.claims.app_metadata?.role;
  const { searchParams } = new URL(request.url);

  const parsed = TimetableQuerySchema.safeParse({
    academicYear: searchParams.get('academicYear'),
    semester: searchParams.get('semester'),
    departmentId: searchParams.get('departmentId') || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { academicYear, semester, departmentId } = parsed.data;

  let campusId: string | undefined;
  if (role === 'campus_director') {
    const directorAuth = await verifyDirector();
    if (directorAuth.success) {
      campusId = directorAuth.campus_id;
    }
  }

  let campusDeptIds: string[] = [];
  if (campusId) {
    const { data: depts } = await supabase
      .from('departments')
      .select('id')
      .eq('campus_id', campusId);
    campusDeptIds = (depts || []).map((d: any) => d.id);
  }

  // 1. Fetch entries
  let query = supabase
    .from('timetable_entries')
    .select(`
      id,
      academic_year,
      semester,
      course_id,
      department_id,
      time_slot_id,
      is_lab_block,
      status,
      courses (
        id,
        title,
        course_code
      ),
      departments (
        id,
        name,
        campus_id
      ),
      time_slots (
        id,
        day_of_week,
        period_number,
        start_time,
        end_time
      )
    `)
    .eq('academic_year', academicYear)
    .eq('semester', semester);

  if (departmentId) {
    query = query.eq('department_id', departmentId);
  } else if (campusId && campusDeptIds.length > 0) {
    query = query.in('department_id', campusDeptIds);
  }

  const { data: rawEntries, error: entriesErr } = await query;

  if (entriesErr) {
    console.error('Fetch timetable entries error:', entriesErr);
    return NextResponse.json({ error: 'Failed to fetch timetable entries' }, { status: 500 });
  }

  const formattedEntries = (rawEntries || []).map((entry: any) => ({
    id: entry.id,
    courseId: entry.course_id,
    courseName: entry.courses?.title || 'Unknown',
    courseCode: entry.courses?.course_code || 'N/A',
    departmentId: entry.department_id,
    departmentName: entry.departments?.name || 'Unknown',
    day: entry.time_slots?.day_of_week,
    period: entry.time_slots?.period_number,
    startTime: entry.time_slots?.start_time,
    endTime: entry.time_slots?.end_time,
    isLabBlock: entry.is_lab_block,
    status: entry.status,
  }));

  // 2. Fetch unresolved conflicts
  let conflictQuery = supabase
    .from('timetable_conflicts')
    .select(`
      id,
      course_id,
      reason,
      conflicting_student_count,
      courses (
        id,
        title,
        department_id
      )
    `)
    .eq('academic_year', academicYear)
    .eq('semester', semester)
    .eq('resolved', false);

  if (departmentId) {
    conflictQuery = conflictQuery.eq('courses.department_id', departmentId);
  } else if (campusId && campusDeptIds.length > 0) {
    conflictQuery = conflictQuery.in('courses.department_id', campusDeptIds);
  }

  const { data: rawConflicts } = await conflictQuery;

  const formattedConflicts = (rawConflicts || []).map((conflict: any) => ({
    id: conflict.id,
    courseId: conflict.course_id,
    courseName: conflict.courses?.title || 'Unknown',
    reason: conflict.reason,
    conflictingStudentCount: conflict.conflicting_student_count || 0,
  }));

  // 3. Fetch all campus departments for complete tab display
  let deptsFetchQuery = supabase
    .from('departments')
    .select('id, name, code')
    .order('name');

  if (campusId && campusDeptIds.length > 0) {
    deptsFetchQuery = deptsFetchQuery.in('id', campusDeptIds);
  }

  const { data: allDepartmentsData } = await deptsFetchQuery;

  const formattedDepartments = (allDepartmentsData || []).map((d: any) => ({
    id: d.id,
    name: d.code ? `${d.name} (${d.code})` : d.name,
  }));

  return NextResponse.json({
    entries: formattedEntries,
    conflicts: formattedConflicts,
    departments: formattedDepartments,
  });
}
