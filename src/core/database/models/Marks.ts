import mongoose from 'mongoose'

export interface IMarks {
  _id: mongoose.Types.ObjectId
  student_id: mongoose.Types.ObjectId
  course_code: string
  semester: number
  academic_year: string
  score: number
  max_score: number
  grade: string
  is_passed: boolean
  createdAt: Date
}

const MarksSchema = new mongoose.Schema<IMarks>(
  {
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    course_code: { type: String, required: true },
    semester: { type: Number, required: true },
    academic_year: { type: String, required: true },
    score: { type: Number, required: true },
    max_score: { type: Number, default: 100 },
    grade: { type: String },
    is_passed: { type: Boolean, default: false },
  },
  { timestamps: true }
)

MarksSchema.index({ student_id: 1, course_code: 1 })
MarksSchema.index({ student_id: 1, semester: 1 })

export const Marks =
  (mongoose.models.Marks as mongoose.Model<IMarks>) ||
  mongoose.model<IMarks>('Marks', MarksSchema)