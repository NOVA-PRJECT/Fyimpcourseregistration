import mongoose from 'mongoose'

export type PrerequisiteType =
  | 'PAPER_REQUIRED'
  | 'PAPER_MIN_SCORE'
  | 'DEPT_REQUIRED'
  | 'DEPT_EXCLUDED'
  | 'QUOTA_RESERVED'

export interface IPrerequisite {
  type: PrerequisiteType
  course_code?: string
  min_score?: number
  department_code?: string
  seats?: number
}

export interface ICourse {
  _id: mongoose.Types.ObjectId
  course_code: string
  title: string
  department_id: mongoose.Types.ObjectId
  semester: number
  credits: number
  category: 'INT' | 'FWD' | 'RPH' | 'CIP' | 'DSS' | 'DSC' | 'DSE' | 'VAC' | 'SEC' | 'MDC' | 'MOOC' | 'AEC'
  tag?: string
  seat_limit: number
  prerequisites: IPrerequisite[]
  createdAt: Date
  updatedAt: Date
}

const PrerequisiteSchema = new mongoose.Schema<IPrerequisite>(
  {
    type: {
      type: String,
      required: true,
      enum: ['PAPER_REQUIRED', 'PAPER_MIN_SCORE', 'DEPT_REQUIRED', 'DEPT_EXCLUDED', 'QUOTA_RESERVED'],
    },
    course_code: { type: String },
    min_score: { type: Number },
    department_code: { type: String },
    seats: { type: Number },
  },
  { _id: false }
)

const CourseSchema = new mongoose.Schema<ICourse>(
  {
    course_code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    title: { type: String, required: true, trim: true },
    department_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    semester: { type: Number, required: true, min: 1, max: 10 },
    credits: { type: Number, required: true, min: 1 },
    category: {
      type: String,
      required: true,
      enum: ['INT', 'FWD', 'RPH', 'CIP', 'DSS', 'DSC', 'DSE', 'VAC', 'SEC', 'MDC', 'MOOC', 'AEC'],
    },
    tag: { type: String, default: null },
    seat_limit: { type: Number, default: 0 },
    prerequisites: { type: [PrerequisiteSchema], default: [] },
  },
  { timestamps: true }
)

CourseSchema.index({ department_id: 1, semester: 1 })
CourseSchema.index({ tag: 1 })

export const Course =
  (mongoose.models.Course as mongoose.Model<ICourse>) ||
  mongoose.model<ICourse>('Course', CourseSchema)