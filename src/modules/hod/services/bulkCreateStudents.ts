import { supabaseAdmin } from '@/core/database/supabaseAdmin'
import { BulkUploadRowSchema, BulkUploadRow } from '@/modules/admin/schemas/bulkUploadSchema'

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
      parseErrors.push({
        row: index + 1,
        email: (rows[index] as any)?.email ?? '',
        status: 'error',
        issues: result.error.issues.map((e: any) => e.message),
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

  // Check for duplicates within the upload itself (cap + roll)
  const capSet = new Set<string>()
  const rollSet = new Set<string>()
  const internalDupeErrors: BulkCreateResult[] = []
  const dedupedRows: Array<{ index: number; data: BulkUploadRow }> = []

  for (const { index, data } of validRows) {
    const capDupe = capSet.has(data.cap_application_number)
    const rollDupe = rollSet.has(data.roll_number)
    if (capDupe || rollDupe) {
      internalDupeErrors.push({
        row: index + 1,
        email: data.email,
        status: 'error',
        issues: [
          ...(capDupe ? [`Duplicate CAP number in this upload: ${data.cap_application_number}`] : []),
          ...(rollDupe ? [`Duplicate roll number in this upload: ${data.roll_number}`] : []),
        ],
      })
    } else {
      capSet.add(data.cap_application_number)
      rollSet.add(data.roll_number)
      dedupedRows.push({ index, data })
    }
  }

  // Check against existing students in DB
  const allCaps = dedupedRows.map(r => r.data.cap_application_number)
  const allRolls = dedupedRows.map(r => r.data.roll_number)

  const [{ data: existingCaps }, { data: existingRolls }] = await Promise.all([
    supabaseAdmin
      .from('students')
      .select('cap_application_number')
      .in('cap_application_number', allCaps),
    supabaseAdmin
      .from('students')
      .select('roll_number')
      .in('roll_number', allRolls),
  ])

  const existingCapSet = new Set((existingCaps ?? []).map((s: any) => s.cap_application_number))
  const existingRollSet = new Set((existingRolls ?? []).map((s: any) => s.roll_number))

  const results: BulkCreateResult[] = [
    ...parseErrors,
    ...internalDupeErrors,
  ]

  // ── Per-row: create auth user then student row ──
  for (const { index, data } of dedupedRows) {
    const rowResult: BulkCreateResult = { row: index + 1, email: data.email, status: 'success' }

    const dupIssues: string[] = []
    if (existingCapSet.has(data.cap_application_number)) {
      dupIssues.push(`CAP number ${data.cap_application_number} already exists`)
    }
    if (existingRollSet.has(data.roll_number)) {
      dupIssues.push(`Roll number ${data.roll_number} already exists`)
    }
    if (dupIssues.length > 0) {
      results.push({ ...rowResult, status: 'error', issues: dupIssues })
      continue
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
      continue
    }

    const authUserId = authData.user.id

    // Insert students row
    const { error: studentError } = await supabaseAdmin.from('students').insert({
      id: authUserId,
      full_name: data.full_name,
      roll_number: data.roll_number,
      cap_application_number: data.cap_application_number,
      academic_year_joined: data.academic_year_joined,
      current_semester: data.current_semester,
      department_id,
      campus_id,
      must_change_password: true,
    })

    if (studentError) {
      // Rollback: delete orphaned auth user
      await supabaseAdmin.auth.admin.deleteUser(authUserId)
      results.push({
        ...rowResult,
        status: 'error',
        issues: [`Student record insert failed: ${studentError.message}`],
      })
      continue
    }

    results.push(rowResult)
  }

  return { success: true, results }
}
