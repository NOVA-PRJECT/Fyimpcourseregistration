import { NextRequest, NextResponse } from 'next/server';
import { verifyDirector, verifySuperAdmin } from '@/core/auth/verifyRole';
import { getSupabaseServerClient } from '@/core/database/supabaseClient';
import { supabaseAdmin } from '@/core/database/supabaseAdmin';
import { ValidateRequestSchema } from '@/lib/timetable/schemas';

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

  const parsed = ValidateRequestSchema.safeParse(body);
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

  // 1. Fetch published entries
  let entriesQuery = dbClient
    .from('timetable_entries')
    .select('id, course_id, department_id, time_slot_id')
    .eq('academic_year', academicYear)
    .eq('semester', semester)
    .eq('status', 'published');

  if (auth.campusId && campusDeptIds.length > 0) {
    entriesQuery = entriesQuery.in('department_id', campusDeptIds);
  }

  const { data: entries, error: entriesErr } = await entriesQuery;

  if (entriesErr) {
    console.error('Fetch timetable entries error in validate:', entriesErr);
    return NextResponse.json({ error: 'Failed to fetch timetable entries' }, { status: 500 });
  }

  if (!entries || entries.length === 0) {
    return NextResponse.json({ newConflicts: 0 });
  }

  // 2. Fetch current approved student registrations
  const courseIds = Array.from(new Set(entries.map((e) => e.course_id)));

  const { data: rawRegistrations, error: regErr } = await dbClient
    .from('student_registrations')
    .select(`
      student_id,
      slot_1_course_id,
      slot_2_course_id,
      slot_3_course_id,
      slot_4_course_id,
      slot_5_course_id,
      slot_6_course_id
    `)
    .eq('academic_year', academicYear)
    .eq('semester', semester);

  if (regErr) {
    return NextResponse.json({ error: `Failed to fetch student registrations: ${regErr.message}` }, { status: 500 });
  }

  // Map: course_id -> Set of student_ids
  const courseStudentMap = new Map<string, Set<string>>();
  for (const reg of rawRegistrations || []) {
    const slots = [
      reg.slot_1_course_id,
      reg.slot_2_course_id,
      reg.slot_3_course_id,
      reg.slot_4_course_id,
      reg.slot_5_course_id,
      reg.slot_6_course_id,
    ];
    for (const cId of slots) {
      if (cId && courseIds.includes(cId)) {
        let set = courseStudentMap.get(cId);
        if (!set) {
          set = new Set<string>();
          courseStudentMap.set(cId, set);
        }
        set.add(reg.student_id);
      }
    }
  }

  // Group entries by time_slot_id
  const slotEntriesMap = new Map<string, typeof entries>();
  for (const entry of entries) {
    let list = slotEntriesMap.get(entry.time_slot_id);
    if (!list) {
      list = [];
      slotEntriesMap.set(entry.time_slot_id, list);
    }
    list.push(entry);
  }

  // Fetch existing conflicts to avoid duplicate records
  const { data: existingConflicts } = await dbClient
    .from('timetable_conflicts')
    .select('course_id, blocking_course_id')
    .eq('academic_year', academicYear)
    .eq('semester', semester)
    .eq('resolved', false);

  const existingConflictPairs = new Set<string>(
    (existingConflicts || []).map((c) => `${c.course_id}:${c.blocking_course_id}`)
  );

  const newConflictsToInsert: any[] = [];

  // Check conflicts slot by slot
  for (const [, slotEntries] of slotEntriesMap.entries()) {
    if (slotEntries.length < 2) continue;

    for (let i = 0; i < slotEntries.length; i++) {
      for (let j = i + 1; j < slotEntries.length; j++) {
        const cA = slotEntries[i];
        const cB = slotEntries[j];

        // Skip self-comparison when the same cross-department course appears in multiple departments
        if (cA.course_id === cB.course_id) continue;

        const studentsA = courseStudentMap.get(cA.course_id) || new Set();
        const studentsB = courseStudentMap.get(cB.course_id) || new Set();

        let sharedCount = 0;
        for (const sId of studentsA) {
          if (studentsB.has(sId)) sharedCount++;
        }

        if (sharedCount > 0) {
          const pairKey1 = `${cA.course_id}:${cB.course_id}`;
          if (!existingConflictPairs.has(pairKey1)) {
            existingConflictPairs.add(pairKey1);
            newConflictsToInsert.push({
              academic_year: academicYear,
              semester,
              course_id: cA.course_id,
              blocking_course_id: cB.course_id,
              reason: `Registration update conflict: ${sharedCount} student(s) enrolled in both courses assigned to the same time slot`,
              conflicting_student_count: sharedCount,
              resolved: false,
            });
          }
        }
      }
    }
  }

  if (newConflictsToInsert.length > 0) {
    const { error: insertErr } = await dbClient
      .from('timetable_conflicts')
      .insert(newConflictsToInsert);

    if (insertErr) {
      console.error('Insert timetable_conflicts error:', insertErr);
      return NextResponse.json({ error: 'Failed to record new conflicts' }, { status: 500 });
    }
  }

  return NextResponse.json({ newConflicts: newConflictsToInsert.length });
}
