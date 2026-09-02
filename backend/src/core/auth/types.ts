export type Role = 'superadmin' | 'campus_director' | 'hod' | 'teaching_staff' | 'student'

export interface AuthUser {
  userId: string
  email: string
  role: Role
  department_id?: string | null
  campus_id?: string | null
  must_change_password?: boolean
  current_semester?: number
  full_name?: string
  token?: string
}

export interface RequestWithUser extends Request {
  user: AuthUser
}
