import { NextRequest, NextResponse } from 'next/server';
import { verifyDirector, verifySuperAdmin } from '@/core/auth/verifyRole';
import { getSupabaseServerClient } from '@/core/database/supabaseClient';
import { supabaseAdmin } from '@/core/database/supabaseAdmin';
import { PublishRequestSchema } from '@/lib/timetable/schemas';

export const dynamic = 'force-dynamic';

async function verifyDirectorOrSuperAdmin() {
  const superAdminAuth = await verifySuperAdmin();
  if (superAdminAuth.success) {
    return { success: true as const, isSuperAdmin: true, campusId: undefined, userId: superAdminAuth.userId };
  }
  const directorAuth = await verifyDirector();
  if (directorAuth.success) {
    return { success: true as const, isSuperAdmin: false, campusId: directorAuth.campus_id, userId: directorAuth.userId };
  }
  return { success: false as const, error: 'Unauthorized', status: 403 };
}

export async function POST(request: NextRequest) {
  const auth = await verifyDirectorOrSuperAdmin();
  if (!auth.success) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = PublishRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { academicYear, semester } = parsed.data;
  const supabase = await getSupabaseServerClient();
  const dbClient = supabaseAdmin || supabase;

  let campusDeptIds: string[] = [];
  if (auth.campusId) {
    const { data: depts } = await dbClient
      .from('departments')
      .select('id')
      .eq('campus_id', auth.campusId);
    campusDeptIds = (depts || []).map((d: any) => d.id);
  }

  // 1. Guard: Check for unresolved conflicts
  let conflictQuery = dbClient
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

  if (auth.campusId && campusDeptIds.length > 0) {
    conflictQuery = conflictQuery.in('courses.department_id', campusDeptIds);
  }

  const { data: conflicts, error: conflictErr } = await conflictQuery;

  if (conflictErr) {
    console.error('Verify timetable conflicts error:', conflictErr);
    return NextResponse.json({ error: 'Failed to verify timetable conflicts' }, { status: 500 });
  }

  if (conflicts && conflicts.length > 0) {
    const formattedConflicts = conflicts.map((c: any) => ({
      courseId: c.course_id,
      courseName: c.courses?.title || 'Unknown',
      reason: c.reason,
      conflictingStudentCount: c.conflicting_student_count || 0,
    }));

    return NextResponse.json(
      {
        error: 'Cannot publish timetable while unresolved conflicts exist',
        conflicts: formattedConflicts,
      },
      { status: 422 }
    );
  }

  // 2. Update status of draft entries to published
  const nowIso = new Date().toISOString();

  let updateQuery = dbClient
    .from('timetable_entries')
    .update({
      status: 'published',
      published_at: nowIso,
    })
    .eq('academic_year', academicYear)
    .eq('semester', semester)
    .eq('status', 'draft');

  if (auth.campusId && campusDeptIds.length > 0) {
    updateQuery = updateQuery.in('department_id', campusDeptIds);
  }

  const { error: updateErr } = await updateQuery;

  if (updateErr) {
    console.error('Publish timetable entries error:', updateErr);
    return NextResponse.json({ error: 'Failed to publish timetable entries' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: 'Timetable published successfully',
    publishedAt: nowIso,
  });
}
