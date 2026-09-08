let createClient;
try {
  createClient = require('c:/Users/windows/Fyimpcourseregistration/node_modules/@supabase/supabase-js').createClient;
} catch (e) {
  createClient = require('c:/Users/windows/Fyimpcourseregistration/backend/node_modules/@supabase/supabase-js').createClient;
}
const fs = require('fs');
const path = require('path');

const envPath = 'c:\\Users\\windows\\Fyimpcourseregistration\\.env';
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = match[2] || '';
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    env[match[1]] = val.trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSync() {
  console.log('====================================================');
  console.log('🚀 Starting Production Synchronization Script');
  console.log('====================================================\n');

  // ─────────────────────────────────────────────────────────
  // 1. UPDATE CAMPUSES GPS GEOFENCE COORDINATES
  // ─────────────────────────────────────────────────────────
  console.log('📍 1. Updating Campus GPS Geofences...');
  const campusCoords = [
    {
      id: '5b5289d5-17eb-43ba-832e-19883e9eaada', // KUC Mangattuparamba
      center_latitude: 11.9388,
      center_longitude: 75.3687,
      radius_meters: 500,
    },
    {
      id: 'feed55c6-deea-46b7-9fa1-a97cfabf0838', // Dr. Janaki Ammal Campus, Thalassery
      center_latitude: 11.7583,
      center_longitude: 75.5262,
      radius_meters: 500,
    },
    {
      id: 'b351869a-8ea8-4e30-b505-1fe559554161', // Dr. P.K. Rajan Memorial Campus, Nileshwaram
      center_latitude: 12.2472,
      center_longitude: 75.1278,
      radius_meters: 500,
    },
    {
      id: '2a05b3e6-c2cf-4011-8b81-18f034431de8', // Swami Anandatheertha Campus, Payyanur
      center_latitude: 12.0983,
      center_longitude: 75.2072,
      radius_meters: 500,
    },
  ];

  for (const c of campusCoords) {
    const { error } = await supabase
      .from('campuses')
      .update({
        center_latitude: c.center_latitude,
        center_longitude: c.center_longitude,
        radius_meters: c.radius_meters,
      })
      .eq('id', c.id);
    if (error) {
      console.error(`Failed to update campus ${c.id}:`, error.message);
    } else {
      console.log(`  ✓ Updated geofence for campus ${c.id} (${c.center_latitude}, ${c.center_longitude})`);
    }
  }

  // ─────────────────────────────────────────────────────────
  // 2. BACKFILL & UPDATE CAMPUS SETTINGS
  // ─────────────────────────────────────────────────────────
  console.log('\n⚙️ 2. Synchronizing Campus Settings & Deadlines...');
  const { data: allCampuses } = await supabase.from('campuses').select('id, name');
  const targetDeadline = '2026-10-31T18:29:59.000Z'; // Open deadline for 2026-27

  for (const camp of allCampuses || []) {
    const { data: existing } = await supabase
      .from('campus_settings')
      .select('id')
      .eq('campus_id', camp.id)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('campus_settings')
        .update({
          deadline: targetDeadline,
          academic_year: '2026-27',
          min_credits: 18,
          max_credits: 26,
        })
        .eq('id', existing.id);
      if (error) console.error(`Error updating settings for ${camp.name}:`, error.message);
      else console.log(`  ✓ Updated deadline & settings for ${camp.name}`);
    } else {
      const { error } = await supabase
        .from('campus_settings')
        .insert({
          campus_id: camp.id,
          deadline: targetDeadline,
          academic_year: '2026-27',
          min_credits: 18,
          max_credits: 26,
        });
      if (error) console.error(`Error creating settings for ${camp.name}:`, error.message);
      else console.log(`  ✓ Created default settings for ${camp.name}`);
    }
  }



  // ─────────────────────────────────────────────────────────
  // 4. SYNC SUPABASE AUTH METADATA FOR ALL ACCOUNTS
  // ─────────────────────────────────────────────────────────
  console.log('\n👥 4. Synchronizing Supabase Auth metadata for all accounts...');
  const [studentsRes, facultyRes, adminsRes] = await Promise.all([
    supabase.from('students').select('id, full_name, department_id, campus_id, current_semester, must_change_password'),
    supabase.from('faculty').select('id, full_name, email, role, department_id, campus_id'),
    supabase.from('admins').select('id, full_name, email, role'),
  ]);

  const students = studentsRes.data || [];
  const faculty = facultyRes.data || [];
  const admins = adminsRes.data || [];

  console.log(`  Target accounts: ${students.length} students, ${faculty.length} faculty, ${admins.length} admins.`);

  let studentSyncCount = 0;
  for (const s of students) {
    try {
      await supabase.auth.admin.updateUserById(s.id, {
        user_metadata: {
          role: 'student',
          full_name: s.full_name,
        },
        app_metadata: {
          role: 'student',
          department_id: s.department_id,
          campus_id: s.campus_id,
          must_change_password: s.must_change_password ?? false,
        },
      });
      studentSyncCount++;
    } catch (err) {
      console.error(`  Error syncing auth student ${s.id}:`, err.message);
    }
  }
  console.log(`  ✓ Synced app_metadata for ${studentSyncCount}/${students.length} students`);

  let facultySyncCount = 0;
  for (const f of faculty) {
    try {
      await supabase.auth.admin.updateUserById(f.id, {
        user_metadata: {
          role: f.role,
          full_name: f.full_name,
        },
        app_metadata: {
          role: f.role,
          department_id: f.department_id,
          campus_id: f.campus_id,
          must_change_password: false,
        },
      });
      facultySyncCount++;
    } catch (err) {
      console.error(`  Error syncing auth faculty ${f.id}:`, err.message);
    }
  }
  console.log(`  ✓ Synced app_metadata for ${facultySyncCount}/${faculty.length} faculty`);

  for (const a of admins) {
    try {
      await supabase.auth.admin.updateUserById(a.id, {
        user_metadata: {
          role: a.role || 'superadmin',
          full_name: a.full_name,
        },
        app_metadata: {
          role: a.role || 'superadmin',
          must_change_password: false,
        },
      });
      console.log(`  ✓ Synced app_metadata for admin ${a.id}`);
    } catch (err) {
      console.error(`  Error syncing admin ${a.id}:`, err.message);
    }
  }

  // ─────────────────────────────────────────────────────────
  // 5. SYNCHRONIZE 188 STUDENT REGISTRATIONS
  // ─────────────────────────────────────────────────────────
  console.log('\n📝 5. Synchronizing 188 Student Registrations...');
  const { data: blueprints } = await supabase.from('semester_blueprints').select('*');
  const bpMap = new Map();
  (blueprints || []).forEach(b => bpMap.set(`${b.department_id}_${b.semester}`, b));

  const sMap = new Map(students.map(s => [s.id, s]));

  const { data: registrations, error: regErr } = await supabase
    .from('student_registrations')
    .select('*');

  if (regErr) {
    console.error('Failed to fetch registrations:', regErr);
    return;
  }

  console.log(`  Fetched ${registrations.length} registrations to inspect and sync.`);

  let syncedRegCount = 0;
  for (const r of registrations) {
    const student = sMap.get(r.student_id);
    if (!student) {
      console.warn(`  Warning: Student ${r.student_id} not found in students table.`);
      continue;
    }

    const bp = bpMap.get(`${student.department_id}_${r.semester}`);
    if (!bp || !bp.pathways || bp.pathways.length === 0) {
      console.warn(`  Warning: Blueprint missing for dept ${student.department_id} sem ${r.semester}`);
      continue;
    }

    const pathway = (bp.pathways || []).find(p => p.id === r.pathway_id) || bp.pathways[0];
    const slots = pathway.slots || [];

    const preferences = r.preferences && Object.keys(r.preferences).length > 0 ? { ...r.preferences } : {};
    const allocation_metadata = r.allocation_metadata && Object.keys(r.allocation_metadata).length > 0 ? { ...r.allocation_metadata } : {};
    const slotUpdates = {};

    for (let i = 1; i <= 6; i++) {
      const slotKey = `slot_${i}`;
      let cid = r[`${slotKey}_course_id`];
      if (!cid && r.selections && Array.isArray(r.selections.courses)) {
        cid = r.selections.courses[i - 1];
        if (cid) {
          slotUpdates[`${slotKey}_course_id`] = cid;
        }
      }
      if (!cid) continue;

      const slotDef = slots[i - 1];
      const isFixed = slotDef && (
        slotDef.rule === 'FIXED' ||
        slotDef.rule === 'CAMPUS_FIXED' ||
        slotDef.rule === 'AEC_ELECT'
      );

      if (isFixed) {
        allocation_metadata[slotKey] = {
          allocated_by: 'fixed',
          course_id: cid,
        };
      } else {
        // Elective slot: ensure preference is recorded with rank 1
        if (!preferences[slotKey] || preferences[slotKey].length === 0) {
          preferences[slotKey] = [{ course_id: cid, rank: 1 }];
        }
        // Mark as allocated
        if (!allocation_metadata[slotKey]) {
          allocation_metadata[slotKey] = {
            allocated_by: 'algorithm',
            round: 1,
            allocated_at: r.submitted_at || new Date().toISOString(),
          };
        }
      }
    }

    const updatePayload = {
      pathway_id: pathway.id,
      campus_id: student.campus_id,
      preferences,
      allocation_metadata,
      ...slotUpdates,
    };

    const { error: updateErr } = await supabase
      .from('student_registrations')
      .update(updatePayload)
      .eq('id', r.id);

    if (updateErr) {
      console.error(`  Error updating registration ${r.id}:`, updateErr.message);
    } else {
      syncedRegCount++;
    }
  }

  console.log(`  ✓ Successfully synchronized ${syncedRegCount}/${registrations.length} student registrations.`);

  console.log('\n====================================================');
  console.log('🎉 Production Synchronization Complete!');
  console.log('====================================================');
}

runSync().catch(err => {
  console.error('Fatal sync error:', err);
  process.exit(1);
});
