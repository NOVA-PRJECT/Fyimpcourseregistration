import { describe, it, expect } from 'vitest'
import { BlueprintUpdateSchema } from '@/modules/hod/schemas/blueprintSchema'
import { SubmitCoursesSchema } from '@/modules/student/schemas/submitSchema'

describe('BlueprintUpdateSchema', () => {
  it('accepts valid single pathway input', () => {
    const input = {
      semester: 3,
      min_credits: 18,
      max_credits: 26,
      pathways: [
        {
          name: 'Default',
          slots: [
            { rule: 'FIXED', target: 'KU3DSCCSE201', name: 'Data Structures' },
            { rule: 'GLOBAL_BASKET', target: 'MDC-3', name: 'Minor' },
          ],
        },
      ],
    }

    const result = BlueprintUpdateSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('accepts valid multi-pathway input', () => {
    const input = {
      semester: 3,
      min_credits: 18,
      max_credits: 26,
      pathways: [
        {
          id: 'pathway-a',
          name: 'Data Science Track',
          slots: [
            { rule: 'FIXED', target: 'KU3DSCCSE201', name: 'Data Structures' },
          ],
        },
        {
          name: 'Systems Track',
          slots: [
            { rule: 'EXCLUDE_DEPT', target: 'IT', name: 'Minor 1' },
          ],
        },
      ],
    }

    const result = BlueprintUpdateSchema.safeParse(input)
    expect(result.success).toBe(true)
    if (result.success) {
      // Pathway with existing id preserves it
      expect(result.data.pathways[0].id).toBe('pathway-a')
      // Pathway without id has undefined (server generates)
      expect(result.data.pathways[1].id).toBeUndefined()
    }
  })

  it('accepts CAMPUS_FIXED rule', () => {
    const input = {
      semester: 1,
      min_credits: 18,
      max_credits: 26,
      pathways: [
        {
          name: 'Default',
          slots: [
            { rule: 'CAMPUS_FIXED', target: 'KU1CAMPUS101', name: 'Campus Course' },
          ],
        },
      ],
    }

    const result = BlueprintUpdateSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('rejects empty pathways array', () => {
    const input = {
      semester: 3,
      min_credits: 18,
      max_credits: 26,
      pathways: [],
    }

    const result = BlueprintUpdateSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('rejects pathway with no slots', () => {
    const input = {
      semester: 3,
      min_credits: 18,
      max_credits: 26,
      pathways: [
        { name: 'Empty Track', slots: [] },
      ],
    }

    const result = BlueprintUpdateSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('rejects max_credits < min_credits', () => {
    const input = {
      semester: 3,
      min_credits: 30,
      max_credits: 18,
      pathways: [
        {
          name: 'Default',
          slots: [{ rule: 'FIXED', target: 'X', name: 'Y' }],
        },
      ],
    }

    const result = BlueprintUpdateSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('rejects slot with empty target', () => {
    const input = {
      semester: 3,
      min_credits: 18,
      max_credits: 26,
      pathways: [
        {
          name: 'Default',
          slots: [{ rule: 'FIXED', target: '', name: 'Test' }],
        },
      ],
    }

    const result = BlueprintUpdateSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('rejects slot with empty name', () => {
    const input = {
      semester: 3,
      min_credits: 18,
      max_credits: 26,
      pathways: [
        {
          name: 'Default',
          slots: [{ rule: 'FIXED', target: 'X', name: '' }],
        },
      ],
    }

    const result = BlueprintUpdateSchema.safeParse(input)
    expect(result.success).toBe(false)
  })
})

describe('SubmitCoursesSchema', () => {
  it('accepts valid submission with pathway_id', () => {
    const input = {
      semester: 3,
      pathway_id: 'pathway-a',
      courses: [
        '550e8400-e29b-41d4-a716-446655440001',
        '550e8400-e29b-41d4-a716-446655440002',
      ],
    }

    const result = SubmitCoursesSchema.safeParse(input)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.pathway_id).toBe('pathway-a')
    }
  })

  it('rejects missing pathway_id', () => {
    const input = {
      semester: 3,
      courses: ['550e8400-e29b-41d4-a716-446655440001'],
    }

    const result = SubmitCoursesSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('rejects empty pathway_id', () => {
    const input = {
      semester: 3,
      pathway_id: '',
      courses: ['550e8400-e29b-41d4-a716-446655440001'],
    }

    const result = SubmitCoursesSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('rejects duplicate courses', () => {
    const id = '550e8400-e29b-41d4-a716-446655440001'
    const input = {
      semester: 3,
      pathway_id: 'pathway-a',
      courses: [id, id],
    }

    const result = SubmitCoursesSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('rejects more than 10 courses', () => {
    const input = {
      semester: 3,
      pathway_id: 'pathway-a',
      courses: Array.from({ length: 11 }, (_, i) =>
        `550e8400-e29b-41d4-a716-44665544${String(i).padStart(4, '0')}`
      ),
    }

    const result = SubmitCoursesSchema.safeParse(input)
    expect(result.success).toBe(false)
  })
})

describe('isCourseEligibleForSlot', () => {
  // Import dynamically to avoid module resolution issues in test
  it('handles AEC_ELECT rule like FIXED', async () => {
    const { isCourseEligibleForSlot } = await import('@/core/utils/slotRules')
    const deptMap = new Map<string, string>()

    const course = {
      course_code: 'KU1CAMPUS101',
      department_id: 'dept-1',
      category: 'AEC',
      tag: null,
    }

    expect(isCourseEligibleForSlot(course, 'AEC_ELECT', 'KU1CAMPUS101', 'dept-1', deptMap)).toBe(true)
    expect(isCourseEligibleForSlot(course, 'AEC_ELECT', 'WRONG_CODE', 'dept-1', deptMap)).toBe(false)
  })

  it('handles FIXED rule', async () => {
    const { isCourseEligibleForSlot } = await import('@/core/utils/slotRules')
    const deptMap = new Map<string, string>()

    const course = {
      course_code: 'KU3DSCCSE201',
      department_id: 'dept-1',
      category: 'DSC',
      tag: null,
    }

    expect(isCourseEligibleForSlot(course, 'FIXED', 'KU3DSCCSE201', 'dept-1', deptMap)).toBe(true)
    expect(isCourseEligibleForSlot(course, 'FIXED', 'OTHER', 'dept-1', deptMap)).toBe(false)
  })
})
