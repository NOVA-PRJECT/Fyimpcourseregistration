const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read .env from backend
const envFile = fs.readFileSync('../backend/.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

const supabaseUrl = env.SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  console.log('--- CAMPUSES ---');
  const { data: campuses } = await supabase.from('campuses').select('*');
  console.log(campuses);

  console.log('--- CAMPUS SETTINGS ---');
  const { data: settings } = await supabase.from('campus_settings').select('*');
  console.log(settings);

  console.log('--- FACULTY (DIRECTORS) ---');
  const { data: directors } = await supabase.from('faculty').select('*').eq('role', 'campus_director');
  console.log(directors);

  console.log('--- STUDENTS COUNT BY CAMPUS ---');
  const { data: students, error: stErr } = await supabase.from('students').select('id, campus_id, department_id, current_semester');
  console.log('Total students:', students ? students.length : 0, stErr);
  if (students && students.length > 0) {
    const campusCounts = {};
    const semesterCounts = {};
    students.forEach(s => {
      campusCounts[s.campus_id] = (campusCounts[s.campus_id] || 0) + 1;
      semesterCounts[s.current_semester] = (semesterCounts[s.current_semester] || 0) + 1;
    });
    console.log('Students by campus_id:', campusCounts);
    console.log('Students by current_semester:', semesterCounts);
    console.log('Sample student:', students[0]);
  }

  console.log('--- DEPARTMENTS ---');
  const { data: depts } = await supabase.from('departments').select('id, name, campus_id');
  console.log(depts);
}

inspect().catch(console.error);
