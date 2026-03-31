import { z } from 'zod'

export const AddFacultySchema = z.object({
  full_name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['hod', 'campus_director']),
  department_id: z.string().uuid().optional(),
})

export type AddFacultyInput = z.infer<typeof AddFacultySchema>