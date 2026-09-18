const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '../backend/.env'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkTeachers() {
  const { data: faculty, error } = await supabase
    .from('faculty')
    .select('id, full_name, email, role, department_id, campus_id');
  console.log('Faculty accounts:', JSON.stringify(faculty, null, 2));

  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const teachers = authUsers?.users?.filter(u => faculty?.some(f => f.id === u.id));
  console.log('Auth users for faculty:', JSON.stringify(teachers?.map(u => ({ id: u.id, email: u.email })), null, 2));
}

checkTeachers().catch(console.error);
