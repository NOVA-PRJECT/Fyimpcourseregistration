import { z } from 'zod'

export const SubmitCoursesSchema = z.object({
  semester: z.number().int().min(1).max(10),
  pathway_id: z.string().min(1),
  courses: z
    .array(z.string().uuid('Invalid Course ID'))
    .min(1, 'At least one course is required')
    .max(10, 'Maximum 10 courses allowed'),
}).refine(
  (data) => new Set(data.courses).size === data.courses.length,
  {
    message: 'You have selected the same paper in more than one courses. Please make sure each course has a different paper.',
    path: ['courses'],
  }
)

export type SubmitCoursesInput = z.infer<typeof SubmitCoursesSchema>