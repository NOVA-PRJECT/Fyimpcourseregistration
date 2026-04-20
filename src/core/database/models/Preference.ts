import mongoose from 'mongoose'

export interface IPreferenceSlot {
  slot: number
  type: 'FIXED' | 'ELECTIVE'
  course_id?: mongoose.Types.ObjectId
  preferences?: {
    rank: number
    course_id: mongoose.Types.ObjectId
  }[]
}

export interface IPreference {
  _id: mongoose.Types.ObjectId
  student_id: mongoose.Types.ObjectId
  department_id: mongoose.Types.ObjectId
  campus_id: mongoose.Types.ObjectId
  semester: number
  academic_year: string
  submitted_at: Date
  slots: IPreferenceSlot[]
}

const PreferenceSlotSchema = new mongoose.Schema<IPreferenceSlot>(
  {
    slot: { type: Number, required: true },
    type: { type: String, required: true, enum: ['FIXED', 'ELECTIVE'] },
    course_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    preferences: [
      {
        rank: { type: Number, required: true },
        course_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
        _id: false,
      },
    ],
  },
  { _id: false }
)

const PreferenceSchema = new mongoose.Schema<IPreference>(
  {
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    department_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    campus_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Campus', required: true },
    semester: { type: Number, required: true },
    academic_year: { type: String, required: true },
    submitted_at: { type: Date, default: Date.now },
    slots: { type: [PreferenceSlotSchema], default: [] },
  },
  { timestamps: true }
)

PreferenceSchema.index(
  { student_id: 1, semester: 1, academic_year: 1 },
  { unique: true }
)

export const Preference =
  (mongoose.models.Preference as mongoose.Model<IPreference>) ||
  mongoose.model<IPreference>('Preference', PreferenceSchema)