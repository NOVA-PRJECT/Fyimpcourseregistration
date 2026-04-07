import { supabaseAdmin } from '@/core/database/supabaseAdmin'
import { BulkUploadRowSchema, BulkUploadRow } from '@/modules/admin/schemas/bulkUploadSchema'

export async function processBulkUpload(
  rows: unknown[],
  department_id: string,
  campus_id: string,
  academic_year: string
) {

  if (!rows || rows.length === 0) {
    return { success: false, error: 'No data provided', status: 400 }
  }

  const validRows: BulkUploadRow[] = []
  const errors: { row: number; issues: string[] }[] = []

  rows.forEach((row, index) => {
    const result = BulkUploadRowSchema.safeParse(row)
    if (result.success) {
      validRows.push(result.data)
    } else {
      errors.push({
        row: index + 1,
        issues: result.error.issues.map(e => e.message),
      })
    }
  })

  if (validRows.length === 0) {
    return { success: false, error: 'No valid rows found', errors, status: 400 }
  }

  // Build insert payload — department and campus come from HOD session (passed in from route)
  const insertPayload = validRows.map(row => ({
    cap_application_number: row.cap_application_number,
    date_of_birth: row.date_of_birth,
    full_name: row.full_name,
    email: row.email === '' ? null : row.email,
    department_id,
    campus_id,
    academic_year,
    is_claimed: false,
  }))

  const { data, error: insertError } = await supabaseAdmin
    .from('admissions_master')
    .insert(insertPayload)
    .select('id')

  if (insertError) {
    if (insertError.code === '23505') {
      return {
        success: false,
        error: 'Some CAP numbers already exist. Remove duplicates and try again.',
        status: 409,
      }
    }
    console.error('processBulkUpload — insert failed:', insertError)
    return {
      success: false,
      error: 'Failed to insert data',
      status: 500,
    }
  }

  return {
    success: true,
    inserted_count: data?.length ?? 0,
    error_count: errors.length,
    errors: errors.length > 0 ? errors : undefined,
  }
}
