import { z } from 'zod';

export const AssignTeacherSchema = z.object({
  teacher_id: z.string().uuid('Invalid teacher ID format'),
  course_id: z.string().uuid('Invalid course ID format'),
});

export type AssignTeacherDto = z.infer<typeof AssignTeacherSchema>;

export const BatchAssignTeacherSchema = z.object({
  assignments: z
    .array(
      z.object({
        teacher_id: z.string().uuid('Invalid teacher ID format'),
        course_id: z.string().uuid('Invalid course ID format'),
      })
    )
    .min(1, 'At least one assignment is required'),
});

export interface BatchAssignmentItem {
  teacher_id: string;
  course_id: string;
}

export type BatchAssignTeacherDto = {
  assignments: BatchAssignmentItem[];
};

