/**
 * Application environment configuration
 * Sourced from EXPO_PUBLIC_* variables
 */

export const ENV = {
  API_BASE_URL:
    process.env.EXPO_PUBLIC_API_BASE_URL || 'http://10.0.2.2:4000',
  SUPABASE_URL:
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    'https://lhnjlwtdphugjaluzrsp.supabase.co',
  SUPABASE_ANON_KEY:
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxobmpsd3RkcGh1Z2phbHV6cnNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NzkxNDcsImV4cCI6MjA5MDE1NTE0N30.nWEb8z19jhNqiY1Pr5FSGAwuqrK_UYZnjOD2B9hdgNY',
};
