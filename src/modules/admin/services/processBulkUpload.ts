import { supabaseAdmin } from '@/core/database/supabaseAdmin'
import { BulkUploadRow, BulkUploadRowSchema } from '@/modules/admin/schemas/bulkUploadSchema'

export async function processBulkUpload(rows: BulkUploadRow[]) {

  if (!rows || rows.length === 0) {
    return {
      success: false,
      error: 'No data provided',
      status: 400,
    }
  }

  const validRows: BulkUploadRow[] = []
  const errors: { row: number; issues: string[] }[] = []

  rows.forEach((row, index) => {
    const result = BulkUploadRowSchema.safeParse(row)
    if (result.success) {
      validRows.push({
        ...result.data,
        email: result.data.email === '' ? undefined : result.data.email,
      })
    } else {
      errors.push({
        row: index + 1,
        issues: result.error.errors.map(e => e.message),
      })
    }
  })

  if (validRows.length === 0) {
    return {
      success: false,
      error: 'No valid rows found',
      errors,
      status: 400,
    }
  }

  const { data, error: insertError } = await supabaseAdmin
    .from('admissions_master')
    .insert(validRows)
    .select('id')

  if (insertError) {
  // Unique constraint violation
  if (insertError.code === '23505') {
    return {
      success: false,
      error: 'Some CAP numbers already exist in the database. Remove duplicates and try again.',
      details: insertError.message,
      status: 409,
    }
  }
  return {
    success: false,
    error: 'Failed to insert admissions data',
    details: insertError.message,
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