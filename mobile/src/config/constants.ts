/**
 * App-wide constants
 */

export type UserRole =
  | 'student'
  | 'teaching_staff'
  | 'hod'
  | 'campus_director'
  | 'superadmin';

export const ROLES = {
  STUDENT: 'student' as const,
  TEACHING_STAFF: 'teaching_staff' as const,
  HOD: 'hod' as const,
  CAMPUS_DIRECTOR: 'campus_director' as const,
  SUPERADMIN: 'superadmin' as const,
};

export const STORAGE_KEYS = {
  AUTH_SESSION: 'fyimp_auth_session',
  OFFLINE_QUEUE: 'fyimp_offline_queue',
  ACTIVE_SEMESTER: 'fyimp_active_semester',
  PUSH_TOKEN: 'fyimp_expo_push_token',
};

export const MIN_TOUCH_TARGET_SIZE = 44; // 44x44 pt minimum for iOS HIG & Android accessibility
