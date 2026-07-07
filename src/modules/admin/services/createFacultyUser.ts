import { supabaseAdmin } from '@/core/database/supabaseAdmin'
import { AddFacultyInput } from '@/modules/admin/schemas/addFacultySchema'

export async function createFacultyUser({
  full_name,
  email,
  password,
  role,
  department_id,
  campus_id,
}: AddFacultyInput & { campus_id: string }) {

  if (role === 'hod' && !department_id) {
    return {
      success: false,
      error: 'HOD must be assigned to a department',
      status: 400,
    }
  }

  if (role === 'campus_director' && department_id) {
    return {
      success: false,
      error: 'Campus Director cannot be assigned to a department',
      status: 400,
    }
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    const isDuplicate = authError?.message?.toLowerCase().includes('already') || authError?.status === 422
    return {
      success: false,
      error: isDuplicate ? 'A user with this email address has already been registered' : 'Failed to create auth account',
      details: authError?.message,
      status: isDuplicate ? 400 : 500,
    }
  }

  const authUserId = authData.user.id

  const { error: facultyError } = await supabaseAdmin
    .from('faculty')
    .insert({
      id: authUserId,
      full_name,
      email,
      role,
      department_id: department_id ?? null,
      campus_id,
    })

  if (facultyError) {
    await supabaseAdmin.auth.admin.deleteUser(authUserId)
    const isForeignKeyError = facultyError.code === '23503'
    return {
      success: false,
      error: isForeignKeyError ? 'Invalid department or campus selected' : 'Failed to create faculty record',
      details: facultyError.message,
      status: isForeignKeyError ? 400 : 500,
    }
  }

  return {
    success: true,
    message: `${role === 'hod' ? 'HOD' : role === 'campus_director' ? 'Campus Director' : 'Teacher'} account created successfully`,
  }
}