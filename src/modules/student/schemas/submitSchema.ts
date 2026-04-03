import { z } from 'zod'

export const SubmitCoursesSchema = z.object({
  semester: z.number().int().min(1).max(10),
  courses: z
    .array(z.string().uuid())
    .min(1, 'At least one course is required')
    .max(6, 'Maximum 6 courses allowed'),
}).refine(
  (data) => new Set(data.courses).size === data.courses.length,
  {
    message: 'Duplicate courses are not allowed',
    path: ['courses'],
  }
)

export type SubmitCoursesInput = z.infer<typeof SubmitCoursesSchema>