const fs = require('fs');

const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split(/\r?\n/).forEach(line => {
  const idx = line.indexOf('=');
  if (idx !== -1) {
    const key = line.substring(0, idx).trim();
    let val = line.substring(idx + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    env[key] = val;
  }
});

process.env.GEMINI_API_KEY = env.GEMINI_API_KEY || env.GOOGLE_API_KEY || env.NEXT_PUBLIC_GEMINI_API_KEY;
process.env.NEXT_PUBLIC_SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
process.env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Test running live loader + AI generation
async function testLive() {
  const { loadGenerationInput } = require('./src/lib/timetable/loader');
  const { runAIGeneration } = require('./src/lib/timetable/ai-generator');

  console.log('Loading input for 2026-27 Sem 1...');
  const input = await loadGenerationInput(supabase, '2026-27', 1);
  console.log(`Loaded ${input.courses.length} courses, ${input.parallelGroups.length} parallel groups.`);

  console.log('Running AI generation with gemini-3.5-flash...');
  const start = Date.now();
  const result = await runAIGeneration(
    input.courses,
    input.parallelGroups,
    input.slotMap,
    input.slotLookup,
    input.studentDeptMap,
    []
  );
  const dur = Date.now() - start;
  console.log(`AI generation completed in ${dur}ms!`);
  console.log(`Assignments: ${result.assignments.length}, Conflicts: ${result.conflicts.length}`);
}

testLive().catch(err => console.error('Live Test Error:', err));
