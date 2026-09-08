import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '../.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        process.env[match[1]] = (match[2] || '').trim().replace(/^['"]|['"]$/g, '');
      }
    }
  }
}

loadEnv();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: runs, error: rErr } = await supabase.from('allocation_runs').select('*').order('triggered_at', { ascending: false }).limit(5);
  console.log('--- RECENT ALLOCATION RUNS ---');
  console.log(JSON.stringify(runs, null, 2));

  const { data: regs, error: regErr } = await supabase.from('student_registrations').select('id, student_id, semester, academic_year, preferences, allocation_metadata, slot_1_course_id, slot_2_course_id').limit(5);
  console.log('--- SAMPLE STUDENT REGISTRATIONS ---');
  console.log(JSON.stringify(regs, null, 2));

  const { data: timetableEntries } = await supabase.from('timetable_entries').select('*').limit(5);
  console.log('--- TIMETABLE ENTRIES SAMPLE ---');
  console.log(JSON.stringify(timetableEntries, null, 2));

  const { data: campusSettings } = await supabase.from('campus_settings').select('*').limit(5);
  console.log('--- CAMPUS SETTINGS SAMPLE ---');
  console.log(JSON.stringify(campusSettings, null, 2));
}

main().catch(console.error);
