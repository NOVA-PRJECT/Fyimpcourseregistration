import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { loadGenerationInput } from '../loader';
import { buildTimetablePrompt } from '../prompt-builder';
import { validateTimetable } from '../validator';
import { AIGeneratorResponse } from '../types';

const envContent = fs.readFileSync('.env', 'utf8');
const env: Record<string, string> = {};
envContent.split(/\r?\n/).forEach(line => {
  const idx = line.indexOf('=');
  if (idx !== -1) {
    const key = line.substring(0, idx).trim();
    let val = line.substring(idx + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    env[key] = val;
  }
});

const apiKey = env.GEMINI_API_KEY || env.GOOGLE_API_KEY || env.NEXT_PUBLIC_GEMINI_API_KEY;
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!);

async function testFlashFull() {
  console.log('Loading input...');
  const input = await loadGenerationInput(supabase, '2026-27', 1);
  const prompt = buildTimetablePrompt(input.courses, input.parallelGroups, []);
  
  console.log('Calling gemini-3.5-flash with deep solving...');
  const start = Date.now();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { response_mime_type: 'application/json', temperature: 0.1 }
    })
  });
  const dur = Date.now() - start;
  console.log(`Response received in ${dur}ms!`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  const parsed = JSON.parse(text) as AIGeneratorResponse;
  console.log(`Parsed ${parsed.assignments.length} course assignments.`);

  const violations = validateTimetable(parsed, input.courses, input.slotMap);
  console.log(`Violations count: ${violations.length}`);
  if (violations.length > 0) {
    console.log('Sample violations:', violations.slice(0, 5));
  } else {
    console.log('🎉 ZERO VIOLATIONS! Perfect schedule generated!');
  }
}

testFlashFull();
