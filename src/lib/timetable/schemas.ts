import { z } from 'zod';

export const GenerateRequestSchema = z.object({
  academicYear: z.string().min(1, 'Academic year is required'),
  semester: z.number().int().min(1).max(10),
});

export const PublishRequestSchema = z.object({
  academicYear: z.string().min(1, 'Academic year is required'),
  semester: z.number().int().min(1).max(10),
});

export const ValidateRequestSchema = z.object({
  academicYear: z.string().min(1, 'Academic year is required'),
  semester: z.number().int().min(1).max(10),
});

export const TimetableQuerySchema = z.object({
  academicYear: z.string().min(1, 'Academic year is required'),
  semester: z.coerce.number().int().min(1).max(10),
  departmentId: z.string().uuid().optional().or(z.literal('')),
});

export const JobStatusQuerySchema = z.object({
  academicYear: z.string().min(1, 'Academic year is required'),
  semester: z.coerce.number().int().min(1).max(10),
});

export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;
export type PublishRequest = z.infer<typeof PublishRequestSchema>;
export type ValidateRequest = z.infer<typeof ValidateRequestSchema>;
