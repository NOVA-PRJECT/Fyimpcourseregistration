import { NextRequest, NextResponse } from 'next/server';
import { verifyDirector, verifySuperAdmin } from '@/core/auth/verifyRole';
import { getSupabaseServerClient } from '@/core/database/supabaseClient';
import { supabaseAdmin } from '@/core/database/supabaseAdmin';
import { GenerateRequestSchema } from '@/lib/timetable/schemas';
import { runGenerationJob } from '@/lib/timetable/job';
import { getRedisClient } from '@/lib/timetable/redisClient';

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

  const parsed = GenerateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { academicYear, semester, dynamicConstraints } = parsed.data;
  const supabase = await getSupabaseServerClient();
  const dbClient = supabaseAdmin || supabase;

  // 1. Guard: Check registration window is closed
  const { data: regWindow } = await dbClient
    .from('registration_windows')
    .select('is_closed')
    .eq('academic_year', academicYear)
    .eq('semester', semester)
    .maybeSingle();

  if (regWindow && !regWindow.is_closed) {
    return NextResponse.json(
      { error: 'Registration window is still open for this semester. Close registrations before generating timetable.' },
      { status: 400 }
    );
  }

  // 2. Guard: Check if a job is already running
  let jobQuery = dbClient
    .from('timetable_generation_jobs')
    .select('id, status')
    .eq('academic_year', academicYear)
    .eq('semester', semester)
    .in('status', ['queued', 'running']);

  if (auth.campusId) {
    jobQuery = jobQuery.eq('campus_id', auth.campusId);
  }

  const { data: existingJob } = await jobQuery.maybeSingle();

  if (existingJob) {
    return NextResponse.json(
      { error: 'A timetable generation job is already running for this semester.' },
      { status: 409 }
    );
  }

  // 3. Create job row in DB via dbClient
  const { data: newJob, error: insertError } = await dbClient
    .from('timetable_generation_jobs')
    .insert({
      academic_year: academicYear,
      semester,
      campus_id: auth.campusId ?? null,
      status: 'queued',
      progress: 0,
      triggered_by: auth.userId,
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (insertError || !newJob) {
    console.error('Timetable generation job insert error:', insertError);
    return NextResponse.json(
      { error: `Could not start generation job: ${insertError?.message || 'Database insert failed'}` },
      { status: 500 }
    );
  }

  const redis = getRedisClient();

  // 4. Trigger background processing with dynamicConstraints
  runGenerationJob(
    newJob.id,
    academicYear,
    semester,
    auth.userId,
    dbClient,
    redis,
    auth.campusId,
    dynamicConstraints
  ).catch((err) => console.error('Background generation job error:', err));

  return NextResponse.json({ jobId: newJob.id, status: 'queued' }, { status: 202 });
}
