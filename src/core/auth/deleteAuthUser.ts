import { supabaseAdmin } from '@/core/database/supabaseAdmin'

/**
 * Centrally manages deleting a Supabase Auth user via the admin API.
 */
export async function deleteAuthUser(userId: string) {
  return await supabaseAdmin.auth.admin.deleteUser(userId)
}
