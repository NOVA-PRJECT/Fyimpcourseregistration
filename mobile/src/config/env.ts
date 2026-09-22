/**
 * Application environment configuration
 * Sourced strictly from EXPO_PUBLIC_* variables
 */

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!apiBaseUrl) {
  throw new Error('Missing required environment variable: EXPO_PUBLIC_API_BASE_URL');
}
if (!supabaseUrl) {
  throw new Error('Missing required environment variable: EXPO_PUBLIC_SUPABASE_URL');
}
if (!supabaseAnonKey) {
  throw new Error('Missing required environment variable: EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

export const ENV = {
  API_BASE_URL: apiBaseUrl,
  SUPABASE_URL: supabaseUrl,
  SUPABASE_ANON_KEY: supabaseAnonKey,
};

