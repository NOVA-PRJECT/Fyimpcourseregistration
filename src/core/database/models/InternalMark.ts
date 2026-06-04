import mongoose from 'mongoose'

export interface IInternalMark {
  _id: mongoose.Types.ObjectId
  student_id: mongoose.Types.ObjectId
  course_id: mongoose.Types.ObjectId
  course_code: string
  semester: number
  academic_year: string
  component: string
  score: number
  max_score: number
  entered_by: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const InternalMarkSchema = new mongoose.Schema<IInternalMark>(
  {
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    course_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    course_code: { type: String, required: true },
    semester: { type: Number, required: true, min: 1, max: 10 },
    academic_year: { type: String, required: true },
    component: { type: String, required: true, trim: true },
    score: { type: Number, required: true, min: 0 },
    max_score: { type: Number, required: true, min: 1 },
    entered_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
)

InternalMarkSchema.index({ student_id: 1, course_id: 1, academic_year: 1 })
InternalMarkSchema.index({ course_id: 1, academic_year: 1 })

export const InternalMark =
  (mongoose.models.InternalMark as mongoose.Model<IInternalMark>) ||
  mongoose.model<IInternalMark>('InternalMark', InternalMarkSchema)
