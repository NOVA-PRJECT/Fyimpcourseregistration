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

  // H4 fix: Insert rows individually to collect per-row errors instead of failing all on one duplicate
  let insertedCount = 0
  const skippedCaps: string[] = []

  for (const row of validRows) {
    const payload = {
      cap_application_number: row.cap_application_number,
      date_of_birth: row.date_of_birth,
      full_name: row.full_name,
      email: row.email === '' ? null : row.email,
      department_id,
      campus_id,
      academic_year,
      is_claimed: false,
    }

    const { error: insertError } = await supabaseAdmin
      .from('admissions_master')
      .insert(payload)

    if (insertError) {
      if (insertError.code === '23505') {
        // Duplicate CAP number — skip and record
        skippedCaps.push(row.cap_application_number)
      } else {
        // Unexpected error — record as validation error
        const rowIndex = validRows.indexOf(row) + errors.filter(e => e.row <= validRows.indexOf(row) + 1).length + 1
        errors.push({
          row: rowIndex,
          issues: [insertError.message || 'Database insert failed'],
        })
      }
    } else {
      insertedCount++
    }
  }

  return {
    success: true,
    inserted_count: insertedCount,
    skipped_count: skippedCaps.length,
    skipped_caps: skippedCaps.length > 0 ? skippedCaps : undefined,
    error_count: errors.length,
    errors: errors.length > 0 ? errors : undefined,
  }
}
