import { z } from 'zod'

export const SubmitCoursesSchema = z.object({
  semester: z.number().int().min(1).max(10),
  courses: z
    .array(z.string().uuid('Invalid course ID'))
    .min(1, 'At least one course is required')
    .max(6, 'Maximum 6 courses allowed'),
    // duplicate check temporarily removed
})

export type SubmitCoursesInput = z.infer<typeof SubmitCoursesSchema>