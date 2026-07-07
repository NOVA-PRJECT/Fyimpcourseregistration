import { z } from 'zod'

// Schema for each row in the HOD bulk-upload CSV
export const BulkUploadRowSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  roll_number: z.string().min(1, 'Roll number is required'),
  cap_application_number: z.string().min(1, 'CAP number is required'),
  academic_year_joined: z.string().min(1, 'Academic year joined is required'),
  current_semester: z.coerce
    .number({ message: 'Semester must be a number' })
    .int()
    .min(1)
    .max(10),
  email: z.string().email('Invalid email address'),
})

export const BulkUploadSchema = z.array(BulkUploadRowSchema)
export type BulkUploadRow = z.infer<typeof BulkUploadRowSchema>