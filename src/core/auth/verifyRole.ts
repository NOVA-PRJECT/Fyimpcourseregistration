import { getSupabaseServerClient } from '@/core/database/supabaseClient'
import { Role } from '@/core/constants/roles'
import { NextResponse } from 'next/server'
import { cache } from 'react'

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

export type VerifiedStudent = {
  userId: string
  department_id: string
  campus_id: string
  role: 'student'
  must_change_password: boolean
  current_semester: number
}

export type AuthError = { success: false; error: string; status: number }
export type AuthSuccess<T> = { success: true } & T

// ─────────────────────────────────────────────
// Shared Faculty Role verification helper
// ─────────────────────────────────────────────

async function verifyFacultyRole(
  expectedRole: 'hod' | 'campus_director' | 'teaching_staff'
): Promise<AuthSuccess<{ userId: string; department_id?: string; campus_id: string; role: typeof expectedRole }> | AuthError> {
  const supabase = await getSupabaseServerClient()
  const { data, error: claimsError } = await supabase.auth.getClaims()
  const claims = data?.claims

  if (claimsError || !claims) {
    return { success: false, error: 'Unauthorized', status: 401 }
  }

  const role = claims.app_metadata?.role
  if (role !== expectedRole) {
    return { success: false, error: 'Unauthorized', status: 403 }
  }

  let departmentId = claims.app_metadata?.department_id
  let campusId = claims.app_metadata?.campus_id

  // If fields are missing from app_metadata, fall back to DB query
  if (!campusId || (expectedRole === 'hod' && !departmentId)) {
    const { data: faculty, error } = await supabase
      .from('faculty')
      .select('role, department_id, campus_id')
      .eq('id', claims.sub)
      .single()

    if (error || !faculty) {
      return { success: false, error: 'Faculty not found', status: 404 }
    }
    if (faculty.role !== expectedRole) {
      return { success: false, error: 'Unauthorized', status: 403 }
    }
    departmentId = faculty.department_id
    campusId = faculty.campus_id
  }

  return {
    success: true,
    userId: claims.sub,
    department_id: departmentId,
    campus_id: campusId!,
    role: expectedRole,
  } as any
}

// ─────────────────────────────────────────────
// verifyHod
// ─────────────────────────────────────────────

export const verifyHod = cache(async (): Promise<AuthSuccess<VerifiedHod> | AuthError> => {
  const auth = await verifyFacultyRole('hod')
  if (!auth.success) return auth
  if (!auth.department_id) {
    return { success: false, error: 'HOD has no department assigned', status: 400 }
  }
  return auth as AuthSuccess<VerifiedHod>
})

// ─────────────────────────────────────────────
// verifyDirector
// ─────────────────────────────────────────────

export const verifyDirector = cache(async (): Promise<AuthSuccess<VerifiedDirector> | AuthError> => {
  const auth = await verifyFacultyRole('campus_director')
  if (!auth.success) return auth
  return auth as AuthSuccess<VerifiedDirector>
})

// ─────────────────────────────────────────────
// verifySuperAdmin
// ─────────────────────────────────────────────

export const verifySuperAdmin = cache(async (): Promise<AuthSuccess<VerifiedSuperAdmin> | AuthError> => {
  const supabase = await getSupabaseServerClient()
  const { data, error: claimsError } = await supabase.auth.getClaims()
  const claims = data?.claims

  if (claimsError || !claims) {
    return { success: false, error: 'Unauthorized', status: 401 }
  }

  const role = claims.app_metadata?.role
  if (role !== 'superadmin') {
    return { success: false, error: 'Unauthorized', status: 403 }
  }

  return {
    success: true,
    userId: claims.sub,
    role: 'superadmin',
  }
})

// ─────────────────────────────────────────────
// verifyTeacher
// ─────────────────────────────────────────────

export const verifyTeacher = cache(async (): Promise<AuthSuccess<VerifiedTeacher> | AuthError> => {
  const auth = await verifyFacultyRole('teaching_staff')
  if (!auth.success) return auth
  return auth as AuthSuccess<VerifiedTeacher>
})

// ─────────────────────────────────────────────
// verifyStudent
// ─────────────────────────────────────────────

export const verifyStudent = cache(async (options?: { allowMustChangePassword?: boolean }): Promise<AuthSuccess<VerifiedStudent> | AuthError> => {
  const supabase = await getSupabaseServerClient()
  const { data, error: claimsError } = await supabase.auth.getClaims()
  const claims = data?.claims

  if (claimsError || !claims) {
    return { success: false, error: 'Unauthorized', status: 401 }
  }

  const role = claims.app_metadata?.role
  if (role !== 'student') {
    return { success: false, error: 'Unauthorized', status: 403 }
  }

  let departmentId = claims.app_metadata?.department_id
  let campusId = claims.app_metadata?.campus_id
  let mustChangePassword = claims.app_metadata?.must_change_password
  let currentSemester: number

  // Fetch current_semester (since it is dynamic/promotion-based) and fallbacks
  if (departmentId && campusId && mustChangePassword !== undefined) {
    const { data: student, error } = await supabase
      .from('students')
      .select('current_semester, must_change_password')
      .eq('id', claims.sub)
      .single()

    if (error || !student) {
      return { success: false, error: 'Student not found', status: 404 }
    }
    mustChangePassword = student.must_change_password
    currentSemester = student.current_semester
  } else {
    const { data: student, error } = await supabase
      .from('students')
      .select('department_id, campus_id, current_semester, must_change_password')
      .eq('id', claims.sub)
      .single()

    if (error || !student) {
      return { success: false, error: 'Student not found', status: 404 }
    }
    departmentId = student.department_id
    campusId = student.campus_id
    mustChangePassword = student.must_change_password
    currentSemester = student.current_semester
  }

  if (mustChangePassword && !options?.allowMustChangePassword) {
    return { success: false, error: 'Password change required', status: 403 }
  }

  return {
    success: true,
    userId: claims.sub,
    department_id: departmentId!,
    campus_id: campusId!,
    role: 'student',
    must_change_password: mustChangePassword,
    current_semester: currentSemester,
  }
})

// ─────────────────────────────────────────────
// requireRole
// ─────────────────────────────────────────────

export async function requireRole(role: Role): Promise<AuthSuccess<any> | AuthError> {
  switch (role) {
    case 'student':
      return verifyStudent()
    case 'hod':
      return verifyHod()
    case 'campus_director':
      return verifyDirector()
    case 'teaching_staff':
      return verifyTeacher()
    case 'superadmin':
      return verifySuperAdmin()
    default:
      return { success: false, error: 'Unauthorized', status: 403 }
  }
}

// ─────────────────────────────────────────────
// Shared JSON Response helper for Auth errors
// ─────────────────────────────────────────────

export function handleAuthError(auth: { success: false; error: string; status: number }) {
  return NextResponse.json({ error: auth.error }, { status: auth.status })
}
