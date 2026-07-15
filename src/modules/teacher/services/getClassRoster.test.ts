import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getClassRoster } from './getClassRoster'
import { supabaseAdmin } from '@/core/database/supabaseAdmin'

vi.mock('@/core/database/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}))

describe('getClassRoster', () => {
  const mockCourseId = '00000000-0000-0000-0000-000000000000'
  const mockCampusId = 'campus-uuid'

  const createChain = () => {
    const chain: any = {
      select: vi.fn().mockImplementation(() => chain),
      eq: vi.fn().mockImplementation(() => chain),
      neq: vi.fn().mockImplementation(() => chain),
      in: vi.fn().mockImplementation(() => chain),
      or: vi.fn().mockImplementation(() => chain),
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
  })

  it('fails if courseId is not a valid UUID', async () => {
    const result = await getClassRoster('invalid-uuid', mockCampusId)
    expect(result.success).toBe(false)
    expect(result.error).toContain('Invalid course ID format')
  })

  it('fails if course does not belong to the campus', async () => {
    const campusSettingsChain = createChain()
    campusSettingsChain.single.mockResolvedValue({
      data: { academic_year: '2026-27' },
      error: null,
    })

    const coursesChain = createChain()
    coursesChain.single.mockResolvedValue({
      data: { id: mockCourseId, title: 'Test Course', course_code: 'TC101', department_id: 'dept-uuid' },
      error: null,
    })

    const departmentsChain = createChain()
    departmentsChain.single.mockResolvedValue({
      data: { campus_id: 'different-campus-uuid' }, // mismatched!
      error: null,
    })

    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === 'campus_settings') return campusSettingsChain
      if (table === 'courses') return coursesChain
      if (table === 'departments') return departmentsChain
      return createChain()
    })

    const result = await getClassRoster(mockCourseId, mockCampusId)
    expect(result.success).toBe(false)
    expect(result.error).toContain('does not belong to your campus')
  })
})
