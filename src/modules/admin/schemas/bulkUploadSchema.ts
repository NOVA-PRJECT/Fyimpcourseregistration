import { z } from 'zod'

export const BulkUploadRowSchema = z.object({
  cap_application_number: z.string().min(1, 'CAP number is required'),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  full_name: z.string().min(1, 'Full name is required'),
  email: z.string().email().optional().or(z.literal('')),
  department_id: z.string().min(1, 'Department ID is required'),
  campus_id: z.string().min(1, 'Campus ID is required'),
  academic_year: z.string().min(1, 'Academic year is required'),
})

export const BulkUploadSchema = z.array(BulkUploadRowSchema)

export type BulkUploadRow = z.infer<typeof BulkUploadRowSchema>