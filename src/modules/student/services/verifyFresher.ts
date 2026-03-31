import { supabaseAdmin } from '@/core/database/supabaseAdmin'
import { VerifyInput } from '../schemas/eligibilitySchema'

export async function verifyFresher({ cap_number, dob, email, password }: VerifyInput) {

  // Final security check on admissions_master
  const { data: admission, error: admissionError } = await supabaseAdmin
    .from('admissions_master')
    .select('full_name, department_id, campus_id, academic_year, is_claimed')
    .eq('cap_application_number', cap_number)
    .eq('date_of_birth', dob)
    .single()

  if (admissionError || !admission) {
    return { success: false, error: 'Verification failed', status: 404 }
  }

  if (admission.is_claimed) {
    return { success: false, error: 'This CAP number has already been claimed', status: 409 }
  }

  // Create Supabase Auth account
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    return {
      success: false,
      error: 'Failed to create account',
      details: authError?.message,
      status: 500,
    }
  }

  const authUserId = authData.user.id

  // Generate roll number
  const rollNumber = `${admission.academic_year}-${cap_number}`

  // Insert into students table
  const { error: studentError } = await supabaseAdmin
    .from('students')
    .insert({
      id: authUserId,
      full_name: admission.full_name,
      roll_number: rollNumber,
      department_id: admission.department_id,
      campus_id: admission.campus_id,
      current_semester: 1,
      cap_application_number: cap_number,
      academic_year_joined: admission.academic_year,
    })

  if (studentError) {
    // Rollback — delete auth user if student insert fails
    await supabaseAdmin.auth.admin.deleteUser(authUserId)
    return {
      success: false,
      error: 'Failed to create student record',
      status: 500,
    }
  }

  // Flip is_claimed to true
  const { error: claimError } = await supabaseAdmin
    .from('admissions_master')
    .update({ is_claimed: true })
    .eq('cap_application_number', cap_number)

  if (claimError) {
    return {
      success: false,
      error: 'Failed to finalize account',
      status: 500,
    }
  }

  return { success: true }
}