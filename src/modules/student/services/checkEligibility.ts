import { supabaseAdmin } from '@/core/database/supabaseAdmin'
import { EligibilityInput } from '../schemas/eligibilitySchema'

export async function checkEligibility({ cap_number, dob }: EligibilityInput) {

  const { data: admission, error } = await supabaseAdmin
    .from('admissions_master')
    .select('full_name, email, department_id, is_claimed')
    .eq('cap_application_number', cap_number)
    .eq('date_of_birth', dob)
    .single()

  if (error || !admission) {
    return { success: false, error: 'No matching record found', status: 404 }
  }

  if (admission.is_claimed) {
    return { success: false, error: 'This CAP number has already been claimed', status: 409 }
  }

  return {
    success: true,
    data: {
      name: admission.full_name,
      email: admission.email,
      department_id: admission.department_id,
    }
  }
}