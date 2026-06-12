import mongoose from 'mongoose'

export interface IUser {
  _id: mongoose.Types.ObjectId
  full_name: string
  email: string
  password: string
  role: 'superadmin' | 'campus_director' | 'hod' | 'teaching_staff' | 'student'
  department_id?: mongoose.Types.ObjectId
  campus_id?: mongoose.Types.ObjectId
  program_id?: mongoose.Types.ObjectId
  current_semester?: number
  cap_application_number?: string
  academic_year_joined?: string
  roll_number?: string
  is_active: boolean
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new mongoose.Schema<IUser>(
  {
    full_name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: ['superadmin', 'campus_director', 'hod', 'teaching_staff', 'student'],
    },
    department_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    campus_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Campus' },
    program_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Program', default: null },
    current_semester: { type: Number, min: 1, max: 10, default: 1 },
    cap_application_number: { type: String, sparse: true, unique: true },
    academic_year_joined: { type: String },
    roll_number: { type: String, sparse: true, unique: true },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: true }
)

export const User =
  (mongoose.models.User as mongoose.Model<IUser>) ||
  mongoose.model<IUser>('User', UserSchema)