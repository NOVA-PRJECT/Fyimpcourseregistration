import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getBlueprint } from './getBlueprint'
import { getSupabaseServerClient } from '@/core/database/supabaseClient'

vi.mock('@/core/database/supabaseClient', () => ({
  getSupabaseServerClient: vi.fn(),
}))

describe('getBlueprint', () => {
  let mockSupabase: any
  const mockAuth: any = {
    userId: 'student-uuid',
    department_id: 'dept-uuid',
    campus_id: 'campus-uuid',
    role: 'student',
    current_semester: 3,
    full_name: 'John Doe',
  }

  const createChain = () => {
    const chain: any = {
      select: vi.fn().mockImplementation(() => chain),
      eq: vi.fn().mockImplementation(() => chain),
      neq: vi.fn().mockImplementation(() => chain),
      in: vi.fn().mockImplementation(() => chain),
      not: vi.fn().mockImplementation(() => chain),
      single: vi.fn().mockImplementation(() => Promise.resolve({ data: null, error: null })),
      maybeSingle: vi.fn().mockImplementation(() => Promise.resolve({ data: null, error: null })),
      then: vi.fn().mockImplementation((onfulfilled) => {
        return Promise.resolve({ data: null, error: null }).then(onfulfilled)
      })
    }
    return chain
  }

  beforeEach(() => {
    vi.clearAllMocks()

    mockSupabase = {
      from: vi.fn(),
    }

    vi.mocked(getSupabaseServerClient).mockResolvedValue(mockSupabase)
  })

  it('fails if campus settings are not found', async () => {
    const campusSettingsChain = createChain()
    campusSettingsChain.single.mockResolvedValue({
      data: null,
      error: new Error('Settings not found'),
    })

    const blueprintChain = createChain()
    const departmentsChain = createChain()

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'campus_settings') return campusSettingsChain
      if (table === 'semester_blueprints') return blueprintChain
      if (table === 'departments') return departmentsChain
      return createChain()
    })

    const result = await getBlueprint(mockAuth)
    expect(result.success).toBe(false)
    expect(result.error).toContain('settings not found')
  })
})
