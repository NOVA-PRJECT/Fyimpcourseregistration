import { z } from 'zod';

export const UserRoleSchema = z.enum([
  'student',
  'teaching_staff',
  'hod',
  'campus_director',
  'superadmin',
]);

export const ProfileResponseSchema = z.object({
  role: UserRoleSchema,
  profile: z.object({
    id: z.string().optional(),
    full_name: z.string().nullable().optional(),
    current_semester: z.number().nullable().optional(),
    department_id: z.string().nullable().optional(),
    campus_id: z.string().nullable().optional(),
    departments: z
      .object({
        name: z.string().optional(),
      })
      .nullable()
      .optional(),
    campuses: z
      .object({
        name: z.string().optional(),
      })
      .nullable()
      .optional(),
  }),
});

export type ProfileResponse = z.infer<typeof ProfileResponseSchema>;
