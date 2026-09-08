import { z } from 'zod';

export const AssignTeacherSchema = z.object({
  teacher_id: z.string().uuid('Invalid teacher ID format'),
  course_id: z.string().uuid('Invalid course ID format'),
});

export type AssignTeacherDto = z.infer<typeof AssignTeacherSchema>;
