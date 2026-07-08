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

  if (rule === SLOT_RULES.DEPT_RESTRICTED) {
    const requiredDeptId = deptMap.get(target)
    return course.department_id === requiredDeptId && ['DSC', 'DSE'].includes(course.category)
  }

  if (rule === SLOT_RULES.EXCLUDE_DEPT) {
    const excludedDeptId = deptMap.get(target)
    return course.department_id !== excludedDeptId && ['DSC', 'DSE'].includes(course.category)
  }

  if (rule === SLOT_RULES.POOL_RESTRICTED) {
    return course.department_id === studentDepartmentId && course.tag === target
  }

  if (rule === SLOT_RULES.GLOBAL_BASKET) {
    if (course.tag !== target) return false
    if (target?.includes('MDC') && course.department_id === studentDepartmentId) return false
    return true
  }

  return false
}
