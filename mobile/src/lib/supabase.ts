import { createClient } from '@supabase/supabase-js';
import { ENV } from '../config/env';
import { secureStorage } from './secure-store';

/**
 * Mobile Supabase Client with persistent encrypted session storage via SecureStore.
 */
export const supabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
  auth: {
    storage: secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
