import { describe, it, expect } from 'vitest'
import { isCourseEligibleForSlot } from './slotRules'
import { SLOT_RULES } from '@/core/constants/courseCategories'

describe('isCourseEligibleForSlot', () => {
  const deptMap = new Map([
    ['CS', 'dept-cs-uuid'],
    ['MATH', 'dept-math-uuid'],
  ])

  it('validates FIXED rule', () => {
    const course = {
      course_code: 'CS101',
      department_id: 'dept-cs-uuid',
      category: 'DSC',
      tag: null,
    }
    expect(isCourseEligibleForSlot(course, SLOT_RULES.FIXED, 'CS101', 'dept-cs-uuid', deptMap)).toBe(true)
    expect(isCourseEligibleForSlot(course, SLOT_RULES.FIXED, 'CS102', 'dept-cs-uuid', deptMap)).toBe(false)
  })

  it('validates DEPT_RESTRICTED rule', () => {
    const course = {
      course_code: 'CS102',
      department_id: 'dept-cs-uuid',
      category: 'DSC',
      tag: null,
    }
    expect(isCourseEligibleForSlot(course, SLOT_RULES.DEPT_RESTRICTED, 'CS', 'dept-cs-uuid', deptMap)).toBe(true)
    expect(isCourseEligibleForSlot(course, SLOT_RULES.DEPT_RESTRICTED, 'MATH', 'dept-cs-uuid', deptMap)).toBe(false)
  })

  it('validates EXCLUDE_DEPT rule', () => {
    const course = {
      course_code: 'MATH101',
      department_id: 'dept-math-uuid',
      category: 'DSC',
      tag: null,
    }
    expect(isCourseEligibleForSlot(course, SLOT_RULES.EXCLUDE_DEPT, 'CS', 'dept-cs-uuid', deptMap)).toBe(true)
    expect(isCourseEligibleForSlot(course, SLOT_RULES.EXCLUDE_DEPT, 'MATH', 'dept-cs-uuid', deptMap)).toBe(false)
  })

  it('validates POOL_RESTRICTED rule', () => {
    const course = {
      course_code: 'CS201',
      department_id: 'dept-cs-uuid',
      category: 'DSE',
      tag: 'pool-a',
    }
    expect(isCourseEligibleForSlot(course, SLOT_RULES.POOL_RESTRICTED, 'pool-a', 'dept-cs-uuid', deptMap)).toBe(true)
    expect(isCourseEligibleForSlot(course, SLOT_RULES.POOL_RESTRICTED, 'pool-b', 'dept-cs-uuid', deptMap)).toBe(false)
  })

  it('validates GLOBAL_BASKET rule', () => {
    const course = {
      course_code: 'MDC101',
      department_id: 'dept-math-uuid',
      category: 'MDC',
      tag: 'MDC-basket',
    }
    expect(isCourseEligibleForSlot(course, SLOT_RULES.GLOBAL_BASKET, 'MDC-basket', 'dept-cs-uuid', deptMap)).toBe(true)
    // If it is MDC and same department, it should fail
    expect(isCourseEligibleForSlot(course, SLOT_RULES.GLOBAL_BASKET, 'MDC-basket', 'dept-math-uuid', deptMap)).toBe(false)
  })
})
