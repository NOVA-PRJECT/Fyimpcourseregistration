import { SLOT_RULES } from '@/core/constants/courseCategories'

export function normalizeCourseCode(code: string | null | undefined): string {
  if (!code) return ''
  let trimmed = code.trim().toUpperCase()
  // Normalize KU1/KU2/KU3 to KU01/KU02/KU03
  trimmed = trimmed.replace(/^KU([1-9])(DSC|MDC|AEC|VAC|SEC|DSS|DSE)/, 'KU0$1$2')
  return trimmed
}

export function isCourseEligibleForSlot(
  course: {
    course_code: string
    department_id: string
    category: string
    tag: string | null
  },
  rule: string,
  target: string,
  studentDepartmentId: string,
  deptMap: Map<string, string>,
  slotName?: string
): boolean {
  if (
    rule === SLOT_RULES.FIXED ||
    rule === SLOT_RULES.AEC_ELECT ||
    rule === SLOT_RULES.CAMPUS_FIXED
  ) {
    return normalizeCourseCode(course.course_code) === normalizeCourseCode(target)
  }

  if (rule === SLOT_RULES.DEPT_RESTRICTED) {
    if (!target) return false
    const allowedDeptCodes = target.split(',').map(code => code.trim().toUpperCase())
    const allowedDeptIds = allowedDeptCodes
      .map(code => deptMap.get(code) || (Array.from(deptMap.values()).includes(code) ? code : undefined))
      .filter((id): id is string => id !== undefined)
    return allowedDeptIds.includes(course.department_id) && ['DSC', 'DSE', 'DSS'].includes(course.category)
  }

  if (rule === SLOT_RULES.EXCLUDE_DEPT) {
    if (!target) return false
    const excludedDeptCodes = target.split(',').map(code => code.trim().toUpperCase())
    const excludedDeptIds = excludedDeptCodes
      .map(code => deptMap.get(code) || (Array.from(deptMap.values()).includes(code) ? code : undefined))
      .filter((id): id is string => id !== undefined)
    
    if (excludedDeptIds.includes(course.department_id)) {
      return false
    }

    const isMdc = (slotName && slotName.toUpperCase().includes('MDC')) || target.toUpperCase().includes('MDC')
    if (isMdc) {
      return course.category === 'MDC'
    }
    return ['DSC', 'DSE', 'DSS'].includes(course.category)
  }

  if (rule === SLOT_RULES.POOL_RESTRICTED) {
    return course.department_id === studentDepartmentId && (course.tag?.trim() === target.trim())
  }

  if (rule === SLOT_RULES.GLOBAL_BASKET) {
    const trimmedTarget = (target || '').trim().toUpperCase()
    const tagMatches = (course.tag || '').trim().toUpperCase() === trimmedTarget
    const codeMatches = normalizeCourseCode(course.course_code) === normalizeCourseCode(trimmedTarget)
    if (!tagMatches && !codeMatches) return false

    if (trimmedTarget.includes('MDC') && course.department_id === studentDepartmentId) {
      return false
    }
    return true
  }

  return false
}
