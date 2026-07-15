import { supabaseAdmin } from '@/core/database/supabaseAdmin'
import { BulkUploadRowSchema, BulkUploadRow } from '@/modules/admin/schemas/bulkUploadSchema'
import { deleteAuthUser } from '@/core/auth/deleteAuthUser'

export interface BulkCreateResult {
  row: number
  email: string
  status: 'success' | 'error'
  issues?: string[]
}

export async function bulkCreateStudents(
  rows: unknown[],
  department_id: string,
  campus_id: string,
  batch_default_password: string
): Promise<{ success: boolean; error?: string; status?: number; results?: BulkCreateResult[] }> {

  if (!rows || rows.length === 0) {
    return { success: false, error: 'No data provided', status: 400 }
  }

  // ── Pre-flight: collect duplicate CAP/roll numbers already in students table ──

  // Parse and validate all rows first
  const validationResults = rows.map((row, index) => {
    const result = BulkUploadRowSchema.safeParse(row)
    return { index, result }
  })

  const parseErrors: BulkCreateResult[] = []
  const validRows: Array<{ index: number; data: BulkUploadRow }> = []

  validationResults.forEach(({ index, result }) => {
    if (result.success) {
      validRows.push({ index, data: result.data })
    } else {
      const rawRow = rows[index] as Record<string, unknown> | null | undefined
      parseErrors.push({
        row: index + 1,
        email: typeof rawRow?.email === 'string' ? rawRow.email : '',
        status: 'error',
        issues: result.error.issues.map(e => e.message),
      })
    }
  })

  if (validRows.length === 0) {
    return {
      success: false,
      error: 'No valid rows found',
      status: 400,
    }
  }

  // Check for duplicates within the upload itself (cap)
  const capSet = new Set<string>()
  const internalDupeErrors: BulkCreateResult[] = []
  const dedupedRows: Array<{ index: number; data: BulkUploadRow }> = []

  for (const { index, data } of validRows) {
    const capDupe = capSet.has(data.cap_application_number)
    if (capDupe) {
      internalDupeErrors.push({
        row: index + 1,
        email: data.email,
        status: 'error',
        issues: [
          `Duplicate CAP number in this upload: ${data.cap_application_number}`
        ],
      })
    } else {
      capSet.add(data.cap_application_number)
      dedupedRows.push({ index, data })
    }
  }

  // Check against existing students in DB
  const allCaps = dedupedRows.map(r => r.data.cap_application_number)

  const { data: existingCaps } = await supabaseAdmin
    .from('students')
    .select('cap_application_number')
    .in('cap_application_number', allCaps)

  const existingCapSet = new Set((existingCaps ?? []).map((s: any) => s.cap_application_number))

  const results: BulkCreateResult[] = [
    ...parseErrors,
    ...internalDupeErrors,
  ]

  // ── Per-row: create auth user then student row ──
  const CHUNK_SIZE = 10
  for (let i = 0; i < dedupedRows.length; i += CHUNK_SIZE) {
    const chunk = dedupedRows.slice(i, i + CHUNK_SIZE)
    await Promise.all(
      chunk.map(async ({ index, data }) => {
        const rowResult: BulkCreateResult = { row: index + 1, email: data.email, status: 'success' }

        const dupIssues: string[] = []
        if (existingCapSet.has(data.cap_application_number)) {
          dupIssues.push(`CAP number ${data.cap_application_number} already exists`)
        }
        if (dupIssues.length > 0) {
          results.push({ ...rowResult, status: 'error', issues: dupIssues })
          return
        }

        // Create Supabase Auth user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: data.email,
          password: batch_default_password,
          email_confirm: true,
        })

        if (authError || !authData.user) {
          results.push({
            ...rowResult,
            status: 'error',
            issues: [authError?.message ?? 'Failed to create auth account'],
          })
          return
        }

        const authUserId = authData.user.id

        // Insert students row
        const { error: studentError } = await supabaseAdmin.from('students').insert({
          id: authUserId,
          full_name: data.full_name,
          cap_application_number: data.cap_application_number,
          academic_year_joined: data.academic_year_joined,
          current_semester: data.current_semester,
          department_id,
          campus_id,
          must_change_password: true,
        })

        if (studentError) {
          // Rollback: delete orphaned auth user
          await deleteAuthUser(authUserId)
          results.push({
            ...rowResult,
            status: 'error',
            issues: [`Student record insert failed: ${studentError.message}`],
          })
          return
        }

        results.push(rowResult)
      })
    )
  }

  results.sort((a, b) => a.row - b.row)
  return { success: true, results }
}
