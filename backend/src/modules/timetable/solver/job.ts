import { SupabaseClient } from '@supabase/supabase-js';
import { Redis } from '@upstash/redis';
import { runAIGeneration } from './generator';
import { loadGenerationInput } from './loader';
import { DynamicConstraint } from './types';
import { formatAIErrorMessage } from './ai-generator';

export async function runGenerationJob(
  jobId: string,
  academicYear: string,
  semester: number,
  triggeredBy: string,
  supabase: SupabaseClient,
  redis: Redis,
  campusId?: string,
  dynamicConstraints: DynamicConstraint[] = []
): Promise<void> {
  const redisKey = `timetable:job:${academicYear}:${semester}${campusId ? `:${campusId}` : ''}`;
  const dbClient = supabase;

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

    await reportProgress(5, '🚀 Starting AI-powered timetable generation job...');

    // 2. Load input data with live status callback (20%)
    const { courses, slotMap, slotLookup, studentDeptMap, parallelGroups, stats: loadStats } =
      await loadGenerationInput(
        dbClient,
        academicYear,
        semester,
        campusId,
        async (p, msg, st) => {
          await reportProgress(Math.min(20, p), msg, st || {});
        }
      );

    await reportProgress(20, '📚 Input loaded. Preparing AI timetable scheduling prompt...', loadStats);

    // 3. Send to AI scheduler with animated progress
    let simulatedProgress = 40;
    const progressInterval = setInterval(() => {
      if (simulatedProgress < 68) {
        simulatedProgress += 3;
        const messages = [
          '🧠 Gemini AI is evaluating student schedule conflict graphs...',
          '🧠 Gemini AI is assigning parallel elective groups and 2-hour lab blocks...',
          '🧠 Gemini AI is balancing weekly day spread across departments...',
          '🧠 Gemini AI is validating hard constraints and lunch break...',
        ];
        const msgIdx = Math.floor((simulatedProgress - 40) / 7) % messages.length;
        reportProgress(simulatedProgress, messages[msgIdx], loadStats).catch(() => {});
      }
    }, 4000);

    let result;
    try {
      result = await runAIGeneration(
        courses,
        parallelGroups,
        slotMap,
        slotLookup,
        studentDeptMap,
        dynamicConstraints,
        async (p, msg) => {
          await reportProgress(p, msg, loadStats);
        },
        semester
      );
    } finally {
      clearInterval(progressInterval);
    }

    await reportProgress(75, '✨ AI schedule generated and verified via deterministic validator.', loadStats);

    // 4. Clear existing timetable entries for this academicYear, semester & campus (85%)
    await reportProgress(
      85,
      `🧹 Clearing prior schedule entries for Semester ${semester} (${academicYear})...`,
      loadStats
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
      .eq('semester', semester);

    // 6. Bulk insert new assignments (90%)
    await reportProgress(
      90,
      `💾 Writing ${result.assignments.length} generated schedule entries to database...`,
      { ...loadStats, placedEntries: result.assignments.length, conflictsCount: result.conflicts.length }
    );

    if (result.assignments.length > 0) {
      const entryRows = result.assignments.map((a) => ({
        academic_year: academicYear,
        semester,
        course_id: a.courseId,
        department_id: a.departmentId,
        time_slot_id: a.timeSlotId,
        is_lab_block: a.isLabBlock,
        session_type: a.sessionType,
        status: 'draft',
      }));

      // Insert in chunks of 500
      const CHUNK_SIZE = 500;
      for (let i = 0; i < entryRows.length; i += CHUNK_SIZE) {
        const chunk = entryRows.slice(i, i + CHUNK_SIZE);
        const { error: insertErr } = await dbClient.from('timetable_entries').insert(chunk);
        if (insertErr) {
          throw new Error(`Failed to save timetable entries: ${insertErr.message}`);
        }
      }
    }

    // 7. Record unresolved conflicts if any
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

    // 8. Mark complete (100%)
    await dbClient
      .from('timetable_generation_jobs')
      .update({
        status: 'completed',
        progress: 100,
        completed_at: new Date().toISOString(),
        error_message: null,
      })
      .eq('id', jobId);

    const completionMsg =
      result.conflicts.length === 0
        ? `🎉 AI Timetable generated successfully with ${result.assignments.length} entries. Zero conflicts!`
        : `⚠️ AI Timetable generated with ${result.assignments.length} entries. ${result.conflicts.length} course(s) require conflict resolution.`;

    const finalPayload = {
      status: 'completed',
      progress: 100,
      stepMessage: completionMsg,
      stats: {
        ...loadStats,
        savedEntriesCount: result.assignments.length,
        conflictsCount: result.conflicts.length,
      },
      jobId,
    };
    await redis.set(redisKey, JSON.stringify(finalPayload), { ex: 3600 });
  } catch (err: any) {
    console.error('Timetable generation job failed:', err);

    const friendlyError = formatAIErrorMessage(err.message || String(err));

    await dbClient
      .from('timetable_generation_jobs')
      .update({
        status: 'failed',
        error_message: friendlyError,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    const failPayload = {
      status: 'failed',
      progress: 0,
      stepMessage: `Generation failed: ${friendlyError}`,
      errorMessage: friendlyError,
      jobId,
    };
    await redis.set(redisKey, JSON.stringify(failPayload), { ex: 3600 });
  }
}
