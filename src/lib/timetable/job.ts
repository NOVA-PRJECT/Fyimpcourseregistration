import { SupabaseClient } from '@supabase/supabase-js';
import { Redis } from '@upstash/redis';
import { generateTimetable } from './generator';
import { loadGenerationInput } from './loader';
import { supabaseAdmin } from '../../core/database/supabaseAdmin';

export async function runGenerationJob(
  jobId: string,
  academicYear: string,
  semester: number,
  triggeredBy: string,
  supabase: SupabaseClient,
  redis: Redis,
  campusId?: string
): Promise<void> {
  const redisKey = `timetable:job:${academicYear}:${semester}${campusId ? `:${campusId}` : ''}`;
  const dbClient = supabaseAdmin || supabase;

  let currentStats: Record<string, any> = {};

  const reportProgress = async (progress: number, stepMessage: string, stats: Record<string, any> = {}) => {
    currentStats = { ...currentStats, ...stats };
    const payload = {
      status: 'running',
      progress,
      stepMessage,
      stats: currentStats,
      jobId,
    };
    await redis.set(redisKey, JSON.stringify(payload), { ex: 3600 });
    await dbClient
      .from('timetable_generation_jobs')
      .update({ progress, updated_at: new Date().toISOString() })
      .eq('id', jobId);
  };

  try {
    // 1. Mark running
    await dbClient
      .from('timetable_generation_jobs')
      .update({ status: 'running', started_at: new Date().toISOString() })
      .eq('id', jobId);

    await reportProgress(0, '🚀 Starting automated timetable generation job...');

    // 2. Load input data with live status callback
    const { courses, slotMap, studentDeptMap, stats: loadStats } = await loadGenerationInput(
      dbClient,
      academicYear,
      semester,
      campusId,
      async (p, msg, st) => {
        await reportProgress(p, msg, st || {});
      }
    );

    // 3. Run algorithm with live progress sync
    const result = generateTimetable(
      courses,
      slotMap,
      studentDeptMap,
      (p, msg, st) => {
        reportProgress(p, msg, { ...loadStats, ...st }).catch(() => {});
      }
    );

    // 4. Clear existing timetable entries for this academicYear, semester & campus
    await reportProgress(
      78,
      `🧹 Clearing prior schedule entries for Semester ${semester} (${academicYear})...`,
      { ...loadStats, ...result.stats }
    );

    let deleteEntriesQuery = dbClient
      .from('timetable_entries')
      .delete()
      .eq('academic_year', academicYear)
      .eq('semester', semester);

    if (campusId) {
      const { data: depts } = await dbClient
        .from('departments')
        .select('id')
        .eq('campus_id', campusId);
      const deptIds = (depts || []).map((d) => d.id);
      if (deptIds.length > 0) {
        deleteEntriesQuery = deleteEntriesQuery.in('department_id', deptIds);
      }
    }
    const { error: deleteErr } = await deleteEntriesQuery;
    if (deleteErr) {
      console.error('Warning: Error clearing old timetable entries:', deleteErr);
    }

    // 5. Clear old unresolved conflicts
    await dbClient
      .from('timetable_conflicts')
      .delete()
      .eq('academic_year', academicYear)
      .eq('semester', semester)
      .eq('resolved', false);

    // 6. Deduplicate & Upsert new draft assignments
    const uniqueAssignmentMap = new Map<string, typeof result.assignments[0]>();
    for (const a of result.assignments) {
      const key = `${academicYear}:${semester}:${a.courseId}:${a.timeSlotId}:${a.departmentId}`;
      uniqueAssignmentMap.set(key, a);
    }
    const deduplicatedAssignments = Array.from(uniqueAssignmentMap.values());

    if (deduplicatedAssignments.length > 0) {
      await reportProgress(
        85,
        `💾 Saving ${deduplicatedAssignments.length} timetable entries across department grids...`,
        { ...loadStats, ...result.stats, savedEntriesCount: deduplicatedAssignments.length }
      );

      const nowIso = new Date().toISOString();
      const insertRows = deduplicatedAssignments.map((a) => ({
        academic_year: academicYear,
        semester,
        course_id: a.courseId,
        department_id: a.departmentId,
        time_slot_id: a.timeSlotId,
        is_lab_block: a.isLabBlock,
        status: 'draft',
        generated_by: triggeredBy,
        generated_at: nowIso,
      }));

      // Upsert in chunks of 500
      const CHUNK_SIZE = 500;
      for (let i = 0; i < insertRows.length; i += CHUNK_SIZE) {
        const chunk = insertRows.slice(i, i + CHUNK_SIZE);
        const { error: insertErr } = await dbClient
          .from('timetable_entries')
          .upsert(chunk, { onConflict: 'academic_year,semester,course_id,time_slot_id,department_id' });
        if (insertErr) {
          throw new Error(`Failed to insert timetable entries: ${insertErr.message}`);
        }
      }
    }

    // 7. Insert conflicts if any
    if (result.conflicts.length > 0) {
      const conflictRows = result.conflicts.map((c) => ({
        academic_year: academicYear,
        semester,
        course_id: c.courseId,
        blocking_course_id: c.blockingCourseIds[0] ?? null,
        reason: c.reason,
        conflicting_student_count: c.conflictingStudentCount,
      }));

      const { error: conflictErr } = await dbClient
        .from('timetable_conflicts')
        .insert(conflictRows);
      if (conflictErr) {
        console.error('Warning: failed to record conflicts', conflictErr);
      }
    }

    // 8. Mark completed with full final stats
    const finalMessage = result.conflicts.length > 0
      ? `⚠️ Timetable generated with ${result.assignments.length} entries. ${result.conflicts.length} course(s) require conflict resolution.`
      : `🎉 Timetable generated successfully! ${result.assignments.length} entries created across all departments with 0 conflicts.`;

    await dbClient
      .from('timetable_generation_jobs')
      .update({
        status: 'completed',
        progress: 100,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    await redis.set(
      redisKey,
      JSON.stringify({
        status: 'completed',
        progress: 100,
        stepMessage: finalMessage,
        stats: { ...loadStats, ...result.stats, savedEntriesCount: deduplicatedAssignments.length },
        jobId,
      }),
      { ex: 3600 }
    );
  } catch (err: unknown) {
    console.error('Background generation job error:', err);
    const safeMessage = sanitizeJobErrorMessage(err);
    await dbClient
      .from('timetable_generation_jobs')
      .update({ status: 'failed', error_message: safeMessage })
      .eq('id', jobId);

    await redis.set(
      redisKey,
      JSON.stringify({ status: 'failed', errorMessage: safeMessage, jobId }),
      { ex: 3600 }
    );
  }
}

export function sanitizeJobErrorMessage(err: unknown): string {
  const rawMsg = err instanceof Error ? err.message : String(err || '');

  // Keep explicit user domain errors intact
  if (
    rawMsg.includes('No student registrations found') ||
    rawMsg.includes('No approved student registrations found') ||
    rawMsg.includes('No course selections found') ||
    rawMsg.includes('No active courses found') ||
    rawMsg.includes('System time slot configurations are missing')
  ) {
    return rawMsg;
  }

  // Handle RLS policy errors
  if (rawMsg.toLowerCase().includes('row-level security') || rawMsg.toLowerCase().includes('permission denied')) {
    return 'Access control restriction prevented schedule generation. Please refresh your session and try again.';
  }

  // Handle raw database or PostgREST errors safely without leaking internal structure
  return 'Database processing error occurred during timetable generation. Please try again or contact system support.';
}
