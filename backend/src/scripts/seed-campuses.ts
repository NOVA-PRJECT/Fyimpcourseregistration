import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Helper to load env variables from .env or ../.env if not set
function loadEnv() {
  const envPaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '../.env'),
    path.resolve(__dirname, '../../.env'),
    path.resolve(__dirname, '../../../.env'),
  ];

  for (const p of envPaths) {
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf-8');
      content.split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const idx = trimmed.indexOf('=');
          if (idx !== -1) {
            const key = trimmed.substring(0, idx).trim();
            const val = trimmed.substring(idx + 1).trim().replace(/^['"]|['"]$/g, '');
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      });
      break;
    }
  }
}

loadEnv();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not defined.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

export const CAMPUS_SEED_DATA = [
  {
    name: 'Dr. Janaki Ammal Campus',
    code: 'JAC',
    center_latitude: 11.7582,
    center_longitude: 75.4944,
    radius_meters: 400,
    morning_cutoff_time: '09:30:00',
    midday_split_time: '13:30:00',
    evening_cutoff_time: '15:30:00',
    day_end_time: '17:00:00',
  },
  {
    name: 'Swami Anandatheertha Campus',
    code: 'SAC',
    center_latitude: 12.0967,
    center_longitude: 75.2014,
    radius_meters: 400,
    morning_cutoff_time: '09:30:00',
    midday_split_time: '13:30:00',
    evening_cutoff_time: '15:30:00',
    day_end_time: '17:00:00',
  },
  {
    name: 'Mangattuparamba Campus',
    code: 'MPC',
    center_latitude: 11.9367,
    center_longitude: 75.3672,
    radius_meters: 400,
    morning_cutoff_time: '09:30:00',
    midday_split_time: '13:30:00',
    evening_cutoff_time: '15:30:00',
    day_end_time: '17:00:00',
  },
  {
    name: 'Mananthavady Campus',
    code: 'MVC',
    center_latitude: 11.8028,
    center_longitude: 76.0031,
    radius_meters: 400,
    morning_cutoff_time: '09:30:00',
    midday_split_time: '13:30:00',
    evening_cutoff_time: '15:30:00',
    day_end_time: '17:00:00',
  },
  {
    name: 'Nileshwaram Campus',
    code: 'NEC',
    center_latitude: 12.2536,
    center_longitude: 75.1278,
    radius_meters: 400,
    morning_cutoff_time: '09:30:00',
    midday_split_time: '13:30:00',
    evening_cutoff_time: '15:30:00',
    day_end_time: '17:00:00',
  },
  {
    name: 'Thavakkara Main Campus',
    code: 'TMC',
    center_latitude: 11.8745,
    center_longitude: 75.3704,
    radius_meters: 400,
    morning_cutoff_time: '09:30:00',
    midday_split_time: '13:30:00',
    evening_cutoff_time: '15:30:00',
    day_end_time: '17:00:00',
  },
];

async function seedCampuses() {
  console.log('🏛️ Seeding campus records with geofences and timing schedules...');

  for (const campus of CAMPUS_SEED_DATA) {
    const { data, error } = await supabase
      .from('campuses')
      .upsert(
        {
          name: campus.name,
          code: campus.code,
          center_latitude: campus.center_latitude,
          center_longitude: campus.center_longitude,
          radius_meters: campus.radius_meters,
          morning_cutoff_time: campus.morning_cutoff_time,
          midday_split_time: campus.midday_split_time,
          evening_cutoff_time: campus.evening_cutoff_time,
          day_end_time: campus.day_end_time,
        },
        { onConflict: 'code' }
      )
      .select('id, name, code, center_latitude, center_longitude')
      .single();

    if (error) {
      console.error(`❌ Failed to upsert campus ${campus.name} (${campus.code}):`, error.message);
    } else {
      console.log(`✅ Upserted ${data.name} [${data.code}] -> (${data.center_latitude}, ${data.center_longitude})`);
    }
  }

  console.log('🎉 Campus geofence seeding complete.');
}

if (require.main === module) {
  seedCampuses().catch((err) => {
    console.error('Fatal error during campus seed:', err);
    process.exit(1);
  });
}
