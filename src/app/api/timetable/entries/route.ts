import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/core/database/supabaseClient';
import { supabaseAdmin } from '@/core/database/supabaseAdmin';
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

  const dbClient = supabaseAdmin || supabase;

  let campusDeptIds: string[] = [];
  if (campusId) {
    const { data: depts } = await dbClient
      .from('departments')
      .select('id')
      .eq('campus_id', campusId);
    campusDeptIds = (depts || []).map((d: any) => d.id);
  }

  // 1. Fetch all campus departments for complete mapping & display
  let deptsFetchQuery = dbClient
    .from('departments')
    .select('id, name, code')
    .order('name');

  if (campusId && campusDeptIds.length > 0) {
    deptsFetchQuery = deptsFetchQuery.in('id', campusDeptIds);
  }

  const { data: allDepartmentsData } = await deptsFetchQuery;

  const formattedDepartments = (allDepartmentsData || []).map((d: any) => ({
    id: d.id,
    name: d.name,
    code: d.code || d.name,
  }));

  const deptMap = new Map<string, { id: string; name: string; code: string }>();
  formattedDepartments.forEach((d: any) => {
    deptMap.set(d.id, d);
  });

  // 2. Fetch timetable entries
  let query = dbClient
    .from('timetable_entries')
    .select(`
      id,
      academic_year,
      semester,
      course_id,
      department_id,
      time_slot_id,
      is_lab_block,
      session_type,
      status,
      courses (
        id,
        title,
        course_code
      ),
      departments (
        id,
        name,
        code,
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
    departmentName: entry.departments?.name || deptMap.get(entry.department_id)?.name || 'Unknown',
    departmentCode: entry.departments?.code || deptMap.get(entry.department_id)?.code || 'Dept',
    day: entry.time_slots?.day_of_week,
    period: entry.time_slots?.period_number,
    startTime: entry.time_slots?.start_time,
    endTime: entry.time_slots?.end_time,
    isLabBlock: entry.is_lab_block,
    sessionType: entry.session_type || 'theory',
    status: entry.status,
  }));

  // 3. Fetch unresolved conflicts with explicit foreign key relationship
  const { data: rawConflicts, error: conflictErr } = await dbClient
    .from('timetable_conflicts')
    .select(`
      id,
      course_id,
      reason,
      conflicting_student_count,
      academic_year,
      semester,
      resolved,
      courses:courses!timetable_conflicts_course_id_fkey (
        id,
        title,
        course_code,
        department_id
      )
    `)
    .eq('academic_year', academicYear)
    .eq('semester', semester)
    .eq('resolved', false);

  if (conflictErr) {
    console.error('Fetch timetable conflicts error:', conflictErr);
  }

  let formattedConflicts = (rawConflicts || []).map((conflict: any) => {
    const courseDeptId = conflict.courses?.department_id;
    const deptInfo = courseDeptId ? deptMap.get(courseDeptId) : null;
    return {
      id: conflict.id,
      courseId: conflict.course_id,
      courseName: conflict.courses?.title || 'Course Conflict',
      courseCode: conflict.courses?.course_code || 'N/A',
      departmentId: courseDeptId,
      departmentName: deptInfo?.name || 'Department',
      departmentCode: deptInfo?.code || deptInfo?.name || 'Dept',
      reason: conflict.reason || 'Scheduling conflict occurred during generation',
      conflictingStudentCount: conflict.conflicting_student_count || 0,
    };
  });

  // Department / Campus filtering in memory
  if (departmentId) {
    formattedConflicts = formattedConflicts.filter((c: any) => c.departmentId === departmentId);
  } else if (campusId && campusDeptIds.length > 0) {
    formattedConflicts = formattedConflicts.filter((c: any) => !c.departmentId || campusDeptIds.includes(c.departmentId));
  }

  return NextResponse.json({
    entries: formattedEntries,
    conflicts: formattedConflicts,
    departments: formattedDepartments,
  });
}
