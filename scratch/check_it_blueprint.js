const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing supabase env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: dept } = await supabase.from('departments').select('id, name, code').eq('code', 'IT').single();
  console.log('IT Department:', dept);

  const { data: bp } = await supabase.from('semester_blueprints').select('*').eq('department_id', dept.id).eq('semester', 1).single();
  console.log('IT S1 Blueprint:');
  console.log(JSON.stringify(bp, null, 2));
}

check();
