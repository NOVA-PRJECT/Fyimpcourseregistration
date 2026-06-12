import mongoose from 'mongoose'

export interface IProgram {
  _id: mongoose.Types.ObjectId
  name: string
  code: string
  department_id: mongoose.Types.ObjectId
  semesters: number
  papers_per_semester: number
  eligibility: string
  createdAt: Date
  updatedAt: Date
}

const ProgramSchema = new mongoose.Schema<IProgram>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    department_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    semesters: { type: Number, required: true, min: 1, max: 12 },
    papers_per_semester: { type: Number, required: true, default: 4, min: 1, max: 10 },
    eligibility: { type: String, required: true, trim: true },
  },
  { timestamps: true }
)

export const Program =
  (mongoose.models.Program as mongoose.Model<IProgram>) ||
  mongoose.model<IProgram>('Program', ProgramSchema)
