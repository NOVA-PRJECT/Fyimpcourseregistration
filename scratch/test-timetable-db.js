const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('--- CAMPUS SETTINGS ---');
  const { data: settings, error: sErr } = await supabase.from('campus_settings').select('*');
  console.log(settings, sErr);

  console.log('--- TIMETABLE JOBS ---');
  const { data: jobs, error: jErr } = await supabase.from('timetable_generation_jobs').select('*').order('created_at', { ascending: false }).limit(5);
  console.log(jobs, jErr);

  console.log('--- STUDENT REGISTRATIONS COUNT ---');
  const { count, error: rErr } = await supabase.from('student_registrations').select('*', { count: 'exact', head: true });
  console.log('Total registrations:', count, rErr);
}

check().catch(console.error);
