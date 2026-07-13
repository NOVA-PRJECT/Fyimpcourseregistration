import { z } from 'zod'

export const AddFacultySchema = z.object({
  full_name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address').max(254),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  role: z.enum(['hod', 'campus_director', 'teaching_staff']),
  department_id: z.string().uuid().optional(),
})

export type AddFacultyInput = z.infer<typeof AddFacultySchema>