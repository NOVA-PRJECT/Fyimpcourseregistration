import { NextRequest, NextResponse } from 'next/server';
import { verifyDirector, verifySuperAdmin } from '@/core/auth/verifyRole';
import { getSupabaseServerClient } from '@/core/database/supabaseClient';
import { JobStatusQuerySchema } from '@/lib/timetable/schemas';
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

export async function GET(request: NextRequest) {
  const auth = await verifyDirectorOrSuperAdmin();
  if (!auth.success) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const parsed = JobStatusQuerySchema.safeParse({
    academicYear: searchParams.get('academicYear'),
    semester: searchParams.get('semester'),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { academicYear, semester } = parsed.data;
  const redisKey = `timetable:job:${academicYear}:${semester}${auth.campusId ? `:${auth.campusId}` : ''}`;
  const redis = getRedisClient();

  // Try Redis first
  try {
    const cached = await redis.get(redisKey);
    if (cached) {
      const parsedData = typeof cached === 'string' ? JSON.parse(cached) : cached;
      return NextResponse.json({
        status: parsedData.status,
        progress: parsedData.progress || 0,
        jobId: parsedData.jobId || null,
        errorMessage: parsedData.errorMessage || parsedData.error || null,
        stepMessage: parsedData.stepMessage || null,
        stats: parsedData.stats || null,
      });
    }
  } catch (err) {
    console.warn('Redis read failed, falling back to DB:', err);
  }

  // Fall back to DB
  const supabase = await getSupabaseServerClient();
  let query = supabase
    .from('timetable_generation_jobs')
    .select('id, status, progress, error_message, created_at')
    .eq('academic_year', academicYear)
    .eq('semester', semester)
    .order('created_at', { ascending: false })
    .limit(1);

  if (auth.campusId) {
    query = query.eq('campus_id', auth.campusId);
  }

  const { data: job, error } = await query.maybeSingle();

  if (error || !job) {
    return NextResponse.json({ status: 'idle', progress: 0, jobId: null });
  }

  return NextResponse.json({
    status: job.status,
    progress: job.progress,
    jobId: job.id,
    errorMessage: job.error_message,
  });
}
