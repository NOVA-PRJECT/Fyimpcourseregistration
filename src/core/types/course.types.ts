import { CourseCategory, SlotRule } from '../constants/courseCategories'
import { Semester } from '../constants/semesters'

export type Course = {
  id: string
  course_code: string
  title: string
  department_id: string
  semester: Semester
  credits: number
  category: CourseCategory
  tag: string | null
}

export type SemesterBlueprint = {
  id: string
  department_id: string
  semester: Semester
  min_credits: number
  max_credits: number
  slot_1_rule: SlotRule | null
  slot_1_target: string | null
  slot_2_rule: SlotRule | null
  slot_2_target: string | null
  slot_3_rule: SlotRule | null
  slot_3_target: string | null
  slot_4_rule: SlotRule | null
  slot_4_target: string | null
  slot_5_rule: SlotRule | null
  slot_5_target: string | null
  slot_6_rule: SlotRule | null
  slot_6_target: string | null
}

export type BlueprintSlot = {
  slot: number
  rule: SlotRule
  course?: Course
  options?: Course[]
}

export type BlueprintResponse = {
  window_status: 'OPEN' | 'CLOSED'
  deadline: string
  min_credits: number
  max_credits: number
  slots: BlueprintSlot[]
}