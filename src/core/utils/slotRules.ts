import { SLOT_RULES } from '@/core/constants/courseCategories'

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
  deptMap: Map<string, string>
): boolean {
  if (rule === SLOT_RULES.FIXED) {
    return course.course_code === target
  }

  if (rule === SLOT_RULES.CAMPUS_FIXED) {
    return course.course_code === target
  }

  if (rule === SLOT_RULES.DEPT_RESTRICTED) {
    if (!target) return false
    const allowedDeptCodes = target.split(',').map(code => code.trim())
    const allowedDeptIds = allowedDeptCodes
      .map(code => deptMap.get(code))
      .filter(id => id !== undefined)
    return allowedDeptIds.includes(course.department_id) && ['DSC', 'DSE'].includes(course.category)
  }

  if (rule === SLOT_RULES.EXCLUDE_DEPT) {
    if (!target) return false
    const excludedDeptCodes = target.split(',').map(code => code.trim())
    const excludedDeptIds = excludedDeptCodes
      .map(code => deptMap.get(code))
      .filter(id => id !== undefined)
    return !excludedDeptIds.includes(course.department_id) && ['DSC', 'DSE'].includes(course.category)
  }

  if (rule === SLOT_RULES.POOL_RESTRICTED) {
    return course.department_id === studentDepartmentId && course.tag === target
  }

  if (rule === SLOT_RULES.GLOBAL_BASKET) {
    if (course.tag !== target) return false
    if (target.includes('MDC') && course.department_id === studentDepartmentId) return false
    return true
  }

  return false
}
