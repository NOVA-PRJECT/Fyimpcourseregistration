export const SUPABASE_COOKIE_OPTIONS = {
  secure: true,
  sameSite: 'lax' as const,
  path: '/',
  httpOnly: true,
}
