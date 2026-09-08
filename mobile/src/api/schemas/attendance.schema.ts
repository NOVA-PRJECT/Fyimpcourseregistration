import { z } from 'zod';

export const CampusSignInStatusSchema = z.object({
  morning: z.object({
    signed_in: z.boolean(),
    timestamp: z.string().nullable().optional(),
    synced_late: z.boolean().optional(),
  }),
  evening: z.object({
    signed_in: z.boolean(),
    timestamp: z.string().nullable().optional(),
    synced_late: z.boolean().optional(),
  }),
  eligible: z.boolean().default(true),
  reason: z.string().nullable().optional(),
});

export const CourseAttendanceItemSchema = z.object({
  course_id: z.string(),
  course_code: z.string(),
  course_title: z.string(),
  attended_classes: z.number(),
  total_classes: z.number(),
  percentage: z.number(),
});

export const StudentAttendanceListSchema = z.object({
  overall_percentage: z.number(),
  courses: z.array(CourseAttendanceItemSchema),
});

export type CampusSignInStatus = z.infer<typeof CampusSignInStatusSchema>;
export type StudentAttendanceList = z.infer<typeof StudentAttendanceListSchema>;
