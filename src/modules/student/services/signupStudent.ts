import { supabaseAdmin } from '@/core/database/supabaseAdmin'
import { z } from 'zod'

export const SignupStudentSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  department_id: z.string().min(1, 'Department is required'),
})

export type SignupStudentInput = z.infer<typeof SignupStudentSchema>

export async function signupStudent({
  full_name,
  email,
  password,
  department_id,
}: SignupStudentInput) {

  // Get department to find campus_id
  const { data: department, error: deptError } = await supabaseAdmin
    .from('departments')
    .select('id, campus_id')
    .eq('id', department_id)
    .single()

  if (deptError || !department) {
    return {
      success: false,
      error: 'Department not found',
      status: 404,
    }
  }

  // Create Supabase Auth account
  const { data: authData, error: authError } = await supabaseAdmin
    .auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

  if (authError || !authData.user) {
    // Handle duplicate email
    if (authError?.message?.includes('already been registered')) {
      return {
        success: false,
        error: 'This email is already registered',
        status: 409,
      }
    }
    return {
      success: false,
      error: 'Failed to create account',
      status: 500,
    }
  }

  const authUserId = authData.user.id

  // Insert into students table with pending status
  const { error: studentError } = await supabaseAdmin
    .from('students')
    .insert({
      id: authUserId,
      full_name,
      department_id: department.id,
      campus_id: department.campus_id,
      current_semester: 1,
      academic_year_joined: new Date().getFullYear().toString(),
      account_status: 'pending',
    })

  if (studentError) {
    // Rollback auth account
    await supabaseAdmin.auth.admin.deleteUser(authUserId)
    return {
      success: false,
      error: 'Failed to create student record',
      status: 500,
    }
  }

  return { success: true }
}