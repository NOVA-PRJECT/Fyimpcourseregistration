import mongoose from 'mongoose'

export interface ICourseAssignment {
  _id: mongoose.Types.ObjectId
  teacher_id: mongoose.Types.ObjectId
  course_id: mongoose.Types.ObjectId
  academic_year: string
  semester: number
  createdAt: Date
  updatedAt: Date
}

const CourseAssignmentSchema = new mongoose.Schema<ICourseAssignment>(
  {
    teacher_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    course_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    academic_year: { type: String, required: true },
    semester: { type: Number, required: true, min: 1, max: 10 },
  },
  { timestamps: true }
)

CourseAssignmentSchema.index({ teacher_id: 1, course_id: 1, academic_year: 1 }, { unique: true })
CourseAssignmentSchema.index({ course_id: 1, academic_year: 1 })

export const CourseAssignment =
  (mongoose.models.CourseAssignment as mongoose.Model<ICourseAssignment>) ||
  mongoose.model<ICourseAssignment>('CourseAssignment', CourseAssignmentSchema)
