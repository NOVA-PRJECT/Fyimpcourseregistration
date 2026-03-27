export const COURSE_CATEGORIES = {
  DSC: 'DSC',
  MDC: 'MDC',
  DSE: 'DSE',
  SEC: 'SEC',
  VAC: 'VAC',
  MOOC: 'MOOC',
} as const

export type CourseCategory = typeof COURSE_CATEGORIES[keyof typeof COURSE_CATEGORIES]

export const SLOT_RULES = {
  FIXED: 'FIXED',
  DEPT_RESTRICTED: 'DEPT_RESTRICTED',
  EXCLUDE_DEPT: 'EXCLUDE_DEPT',
  POOL_RESTRICTED: 'POOL_RESTRICTED',
  GLOBAL_BASKET: 'GLOBAL_BASKET',
} as const

export type SlotRule = typeof SLOT_RULES[keyof typeof SLOT_RULES]