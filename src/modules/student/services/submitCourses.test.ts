import { describe, it, expect, vi, beforeEach } from 'vitest'
import { submitCourses } from './submitCourses'
import { getSupabaseServerClient } from '@/core/database/supabaseClient'
import { supabaseAdmin } from '@/core/database/supabaseAdmin'

vi.mock('@/core/database/supabaseClient', () => ({
  getSupabaseServerClient: vi.fn(),
}))

vi.mock('@/core/database/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: vi.fn().mockImplementation(() => {
      const chain: any = {
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }
      return chain
    }),
  },
}))

describe('submitCourses', () => {
  let mockSupabase: any
  const mockAuth: any = {
    userId: 'student-uuid',
    department_id: 'dept-uuid',
    campus_id: 'campus-uuid',
    role: 'student',
    current_semester: 3,
  }

  const createChain = () => {
    const chain: any = {
      select: vi.fn().mockImplementation(() => chain),
      eq: vi.fn().mockImplementation(() => chain),
      neq: vi.fn().mockImplementation(() => chain),
      in: vi.fn().mockImplementation(() => chain),
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

  it('fails if slot and course semester is mismatched', async () => {
    const campusSettingsChain = createChain()
    campusSettingsChain.single.mockResolvedValue({
      data: {
        min_credits: 18,
        max_credits: 26,
        academic_year: '2026-27',
        deadline: new Date(Date.now() + 86400000).toISOString(),
      },
      error: null,
    })

    const blueprintChain = createChain()
    blueprintChain.single.mockResolvedValue({
      data: {
        min_credits: 18,
        max_credits: 26,
        slot_1_rule: 'FIXED',
        slot_1_target: 'CS301',
      },
      error: null,
    })

    const departmentsChain = createChain()
    departmentsChain.then = (onfulfilled: any) => {
      return Promise.resolve({
        data: [{ id: 'dept-uuid', code: 'CS', name: 'Computer Science' }],
        error: null,
      }).then(onfulfilled)
    }

    const coursesChain = createChain()
    coursesChain.then = (onfulfilled: any) => {
      return Promise.resolve({
        data: [
          {
            id: 'course-1-uuid',
            course_code: 'CS301',
            credits: 4,
            category: 'DSC',
            tag: null,
            department_id: 'dept-uuid',
            semester: 4, // mismatched!
          },
        ],
        error: null,
      }).then(onfulfilled)
    }

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'campus_settings') return campusSettingsChain
      if (table === 'semester_blueprints') return blueprintChain
      if (table === 'departments') return departmentsChain
      if (table === 'courses') return coursesChain
      return createChain()
    })

    const result = await submitCourses(mockAuth, { semester: 3, courses: ['course-1-uuid'] })
    expect(result.success).toBe(false)
    expect(result.error).toContain('active semester')
  })
})
