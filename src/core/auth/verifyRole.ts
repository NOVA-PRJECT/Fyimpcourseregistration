import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type VerifiedHod = {
  userId: string
  department_id: string
  campus_id: string
  role: 'hod'
}

export type VerifiedDirector = {
  userId: string
  campus_id: string
  role: 'campus_director'
}

export type VerifiedSuperAdmin = {
  userId: string
  role: 'superadmin'
}

export type VerifiedTeacher = {
  userId: string
  campus_id: string
  role: 'teaching_staff'
}

type AuthError = { success: false; error: string; status: number }
type AuthSuccess<T> = { success: true } & T

// ─────────────────────────────────────────────
// Internal: build a session-based Supabase client
// ─────────────────────────────────────────────

function buildSupabaseClient(cookieStore: ReadonlyRequestCookies) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}

// ─────────────────────────────────────────────
// verifyHod
// Returns the verified HOD's userId, department_id, and campus_id.
// Use at the top of every HOD route handler.
// ─────────────────────────────────────────────

export async function verifyHod(): Promise<AuthSuccess<VerifiedHod> | AuthError> {
  const cookieStore = await cookies()
  const supabase = buildSupabaseClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized', status: 401 }

  const { data: faculty, error } = await supabase
    .from('faculty')
    .select('role, department_id, campus_id')
    .eq('id', user.id)
    .single()

  if (error || !faculty) return { success: false, error: 'Faculty not found', status: 404 }
  if (faculty.role !== 'hod') return { success: false, error: 'Unauthorized', status: 403 }
  if (!faculty.department_id) return { success: false, error: 'HOD has no department assigned', status: 400 }

  return {
    success: true,
    userId: user.id,
    department_id: faculty.department_id,
    campus_id: faculty.campus_id,
    role: 'hod',
  }
}

// ─────────────────────────────────────────────
// verifyDirector
// Returns the verified Campus Director's userId and campus_id.
// Use at the top of every campus_director route handler.
// ─────────────────────────────────────────────

export async function verifyDirector(): Promise<AuthSuccess<VerifiedDirector> | AuthError> {
  const cookieStore = await cookies()
  const supabase = buildSupabaseClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized', status: 401 }

  const { data: faculty, error } = await supabase
    .from('faculty')
    .select('role, campus_id')
    .eq('id', user.id)
    .single()

  if (error || !faculty) return { success: false, error: 'Faculty not found', status: 404 }
  if (faculty.role !== 'campus_director') return { success: false, error: 'Unauthorized', status: 403 }

  return {
    success: true,
    userId: user.id,
    campus_id: faculty.campus_id,
    role: 'campus_director',
  }
}

// ─────────────────────────────────────────────
// verifySuperAdmin
// Returns the verified superadmin's userId.
// Use at the top of every superadmin route handler.
// ─────────────────────────────────────────────

export async function verifySuperAdmin(): Promise<AuthSuccess<VerifiedSuperAdmin> | AuthError> {
  const cookieStore = await cookies()
  const supabase = buildSupabaseClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized', status: 401 }

  const { data: admin, error } = await supabase
    .from('admins')
    .select('role')
    .eq('id', user.id)
    .single()

  if (error || !admin) return { success: false, error: 'Unauthorized', status: 401 }
  if (admin.role !== 'superadmin') return { success: false, error: 'Unauthorized', status: 403 }

  return {
    success: true,
    userId: user.id,
    role: 'superadmin',
  }
}

// ─────────────────────────────────────────────
// verifyTeacher
// Returns the verified teaching_staff's userId and campus_id.
// Use at the top of every teacher route handler.
// ─────────────────────────────────────────────

export async function verifyTeacher(): Promise<AuthSuccess<VerifiedTeacher> | AuthError> {
  const cookieStore = await cookies()
  const supabase = buildSupabaseClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized', status: 401 }

  const { data: faculty, error } = await supabase
    .from('faculty')
    .select('role, campus_id')
    .eq('id', user.id)
    .single()

  if (error || !faculty) return { success: false, error: 'Faculty not found', status: 404 }
  if (faculty.role !== 'teaching_staff') return { success: false, error: 'Unauthorized', status: 403 }

  return {
    success: true,
    userId: user.id,
    campus_id: faculty.campus_id,
    role: 'teaching_staff',
  }
}

// ─────────────────────────────────────────────
// verifyStudent
// Returns the verified student's userId and department_id.
// Use at the top of every student route handler.
// ─────────────────────────────────────────────

export type VerifiedStudent = {
  userId: string
  department_id: string
  campus_id: string
  role: 'student'
  must_change_password: boolean
}

export async function verifyStudent(options?: { allowMustChangePassword?: boolean }): Promise<AuthSuccess<VerifiedStudent> | AuthError> {
  const cookieStore = await cookies()
  const supabase = buildSupabaseClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized', status: 401 }

  const { data: student, error } = await supabase
    .from('students')
    .select('department_id, campus_id, must_change_password')
    .eq('id', user.id)
    .single()

  if (error || !student) return { success: false, error: 'Student not found', status: 404 }

  if (student.must_change_password && !options?.allowMustChangePassword) {
    return { success: false, error: 'Password change required', status: 403 }
  }

  return {
    success: true,
    userId: user.id,
    department_id: student.department_id,
    campus_id: student.campus_id,
    role: 'student',
    must_change_password: student.must_change_password,
  }
}
