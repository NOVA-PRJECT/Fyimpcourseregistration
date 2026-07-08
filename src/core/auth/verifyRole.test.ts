import { describe, it, expect, vi, beforeEach } from 'vitest'
import { verifyStudent } from './verifyRole'
import { getSupabaseServerClient } from '@/core/database/supabaseClient'

vi.mock('@/core/database/supabaseClient', () => ({
  getSupabaseServerClient: vi.fn(),
}))

describe('verifyRole', () => {
  let mockSupabase: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockSupabase = {
      auth: {
        getClaims: vi.fn(),
      },
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    }

    vi.mocked(getSupabaseServerClient).mockResolvedValue(mockSupabase)
  })

  it('fails if getClaims fails', async () => {
    mockSupabase.auth.getClaims.mockResolvedValue({ data: null, error: new Error('Session error') })

    const result = await verifyStudent()
    expect(result.success).toBe(false)
    expect(result.status).toBe(401)
  })

  it('fails if role is mismatched', async () => {
    mockSupabase.auth.getClaims.mockResolvedValue({
      data: {
        claims: {
          sub: 'user-uuid',
          app_metadata: { role: 'teacher' },
        },
      },
      error: null,
    })

    const result = await verifyStudent()
    expect(result.success).toBe(false)
    expect(result.status).toBe(403)
  })

  it('succeeds for valid student', async () => {
    mockSupabase.auth.getClaims.mockResolvedValue({
      data: {
        claims: {
          sub: 'student-uuid',
          app_metadata: {
            role: 'student',
            department_id: 'dept-uuid',
            campus_id: 'campus-uuid',
            must_change_password: false,
          },
        },
      },
      error: null,
    })

    mockSupabase.single.mockResolvedValue({
      data: {
        current_semester: 4,
        must_change_password: false,
        full_name: 'John Doe',
      },
      error: null,
    })

    const result = await verifyStudent()
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.userId).toBe('student-uuid')
      expect(result.current_semester).toBe(4)
      expect(result.full_name).toBe('John Doe')
    }
  })
})
