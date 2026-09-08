import { z } from 'zod';

export const CourseSchema = z.object({
  id: z.string(),
  code: z.string(),
  title: z.string(),
  credits: z.number().optional().default(0),
  category: z.string().optional().default(''),
  faculty_name: z.string().nullable().optional(),
});

export const TimetableSlotSchema = z.object({
  id: z.string(),
  day_of_week: z.string().or(z.number()),
  start_time: z.string(),
  end_time: z.string(),
  period_index: z.number().optional(),
  course_code: z.string(),
  course_title: z.string(),
  room_number: z.string().nullable().optional(),
  faculty_name: z.string().nullable().optional(),
});

export const StudentDashboardSchema = z.object({
  todaySlots: z.array(TimetableSlotSchema).optional().default([]),
  attendanceSummary: z
    .object({
      overallPercentage: z.number().optional().default(0),
      totalPresent: z.number().optional().default(0),
      totalClasses: z.number().optional().default(0),
      campusSignInStatus: z
        .object({
          morning: z.boolean().optional().default(false),
          evening: z.boolean().optional().default(false),
        })
        .optional(),
    })
    .optional(),
  latestAnnouncement: z
    .object({
      id: z.string().optional(),
      title: z.string().optional(),
      content: z.string().optional(),
      created_at: z.string().optional(),
    })
    .nullable()
    .optional(),
});

export type StudentDashboard = z.infer<typeof StudentDashboardSchema>;
export type TimetableSlot = z.infer<typeof TimetableSlotSchema>;
export type Course = z.infer<typeof CourseSchema>;
