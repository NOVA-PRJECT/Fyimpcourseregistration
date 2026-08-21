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

const apiKey = env.GEMINI_API_KEY || env.GOOGLE_API_KEY || env.NEXT_PUBLIC_GEMINI_API_KEY;

// Import prompt builder and loader dependencies
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function testFullPrompt() {
  // Read base constraints
  const baseConstraints = JSON.parse(fs.readFileSync('src/lib/timetable/constraints.base.json', 'utf8'));
  
  // Test call with real courses prompt
  const testPrompt = `You are an expert university timetable scheduler for Kannur University's FYIMP programme.
Your task is to assign time slots to courses for one week. The timetable repeats every week.
You must satisfy all hard constraints. Satisfy soft constraints where possible.
Respond ONLY with valid JSON. No explanation, no markdown, no preamble.

## Weekly Schedule Structure
Days: Monday (1) to Friday (5).
Period 1 (P1): 09:30–10:30
Period 2 (P2): 10:30–11:30
Period 3 (P3): 11:30–12:30
Period 4 (P4): 13:30–14:30
Period 5 (P5): 14:30–15:30
Period 6 (P6): 15:30–16:30 [Extended — use only if necessary]
Lunch break: 12:30–13:30. No classes during this time.

## Hard Constraints (must not be violated)
1. A student must never have two courses scheduled in the same time slot
2. No class of any kind may be scheduled during the lunch break (12:30 to 13:30)
3. Lab blocks (practical sessions) must occupy exactly 2 consecutive periods on the same day
4. A lab block must never span from Period 3 into Period 4 as this crosses the lunch break
5. Valid lab blocks are: P1+P2, P2+P3, P4+P5, P5+P6 only
6. Each course must be assigned exactly its theory_hours_per_week theory slots per week
7. Each course must be assigned exactly its practical_hours_per_week practical hours per week, placed as 2-hour lab blocks
8. Do not assign more slots than a course requires — stop exactly at the required hours
9. Theory hours should be spread across different days of the week where possible
10. Lab blocks are preferred in the afternoon (P4+P5 or P5+P6) over morning blocks

## Courses to Schedule
Course ID: c1
  Code: KU01DSCCSE101
  Title: Programming
  Department: IT
  Category: DSC
  Theory hours/week: 3
  Practical hours/week: 2 (place as 2-hour lab blocks)
  Type: Single-department
  Students enrolled: 30
  No conflicts with other courses

## Required Output Format
Respond with ONLY this JSON structure. No other text.
{
  "assignments": [
    {
      "courseId": "c1",
      "slots": [
        { "day": 1, "period": 1, "sessionType": "theory", "isLabBlock": false },
        { "day": 2, "period": 1, "sessionType": "theory", "isLabBlock": false },
        { "day": 3, "period": 1, "sessionType": "theory", "isLabBlock": false },
        { "day": 4, "period": 4, "sessionType": "practical", "isLabBlock": true },
        { "day": 4, "period": 5, "sessionType": "practical", "isLabBlock": true }
      ]
    }
  ]
}`;

  for (const model of ['gemini-3.5-flash', 'gemini-flash-latest', 'gemini-3.6-flash']) {
    console.log(`\nTesting ${model}...`);
    const start = Date.now();
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: testPrompt }] }],
          generationConfig: { response_mime_type: 'application/json', temperature: 0.1 }
        })
      });
      const dur = Date.now() - start;
      console.log(`${model} response status:`, res.status, `in ${dur}ms`);
      const data = await res.json();
      if (res.ok) {
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        console.log('Output preview:', text?.substring(0, 150));
      } else {
        console.log('Error payload:', JSON.stringify(data));
      }
    } catch (e) {
      console.log(`${model} fetch error:`, e.message);
    }
  }
}

testFullPrompt();
