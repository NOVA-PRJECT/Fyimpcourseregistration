import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wazosgyevpznojysxmuv.supabase.co'
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indhem9zZ3lldnB6bm9qeXN4bXV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5MDI2NDgsImV4cCI6MjEwNDQ3ODY0OH0.yOB50BprDOi7xRLTrkveMKYHMJrUqAcRDzX76iz8IHs'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'pkce',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
