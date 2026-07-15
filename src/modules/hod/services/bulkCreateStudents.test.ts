import { describe, it, expect, vi, beforeEach } from 'vitest'
import { bulkCreateStudents } from './bulkCreateStudents'
import { supabaseAdmin } from '@/core/database/supabaseAdmin'

vi.mock('@/core/database/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}))

describe('bulkCreateStudents', () => {
  const mockDeptId = 'dept-uuid'
  const mockCampusId = 'campus-uuid'
  const mockPassword = 'SecurePassword123'

  const createChain = () => {
    const chain: any = {
      select: vi.fn().mockImplementation(() => chain),
      in: vi.fn().mockImplementation(() => chain),
      then: vi.fn().mockImplementation((onfulfilled) => {
        return Promise.resolve({ data: [], error: null }).then(onfulfilled)
      })
    }
    return chain
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fails if no rows are provided', async () => {
    const result = await bulkCreateStudents([], mockDeptId, mockCampusId, mockPassword)
    expect(result.success).toBe(false)
    expect(result.error).toContain('No data provided')
  })

  it('returns failure if no rows are valid', async () => {
    const invalidRows = [{ email: 'invalid-email' }] // fails BulkUploadRowSchema

    const result = await bulkCreateStudents(invalidRows, mockDeptId, mockCampusId, mockPassword)
    expect(result.success).toBe(false)
    expect(result.error).toContain('No valid rows found')
  })
})
