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

  // Validate every row first
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
    return {
      success: false,
      error: 'No valid rows found',
      errors,
      status: 400,
    }
  }

  // Resolve all unique department names to IDs
  const uniqueDeptNames = [...new Set(validRows.map(r => r.department_name))]
  const deptMap: Record<string, string> = {}

  for (const name of uniqueDeptNames) {
    const { data: dept } = await supabaseAdmin
      .from('departments')
      .select('id')
      .eq('name', name)
      .single()

    if (dept) {
      deptMap[name] = dept.id
    } else {
      return {
        success: false,
        error: `Department not found: "${name}". Check the department name matches exactly.`,
        status: 400,
      }
    }
  }

  // Resolve all unique campus codes to IDs
  const uniqueCampusCodes = [...new Set(validRows.map(r => r.campus_code))]
  const campusMap: Record<string, string> = {}

  for (const code of uniqueCampusCodes) {
    const { data: campus } = await supabaseAdmin
      .from('campuses')
      .select('id')
      .eq('code', code)
      .single()

    if (campus) {
      campusMap[code] = campus.id
    } else {
      return {
        success: false,
        error: `Campus not found: "${code}". Check the campus code matches exactly.`,
        status: 400,
      }
    }
  }

  // Build final insert payload with resolved IDs
  const insertPayload = validRows.map(row => ({
    cap_application_number: row.cap_application_number,
    date_of_birth: row.date_of_birth,
    full_name: row.full_name,
    email: row.email === '' ? null : row.email,
    department_id: deptMap[row.department_name],
    campus_id: campusMap[row.campus_code],
    academic_year: row.academic_year,
    is_claimed: false,
  }))

  // Bulk insert
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