import mongoose from 'mongoose'

export interface IDepartment {
  _id: mongoose.Types.ObjectId
  name: string
  code: string
  campus_id: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const DepartmentSchema = new mongoose.Schema<IDepartment>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    campus_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Campus', required: true },
  },
  { timestamps: true }
)

export const Department =
  (mongoose.models.Department as mongoose.Model<IDepartment>) ||
  mongoose.model<IDepartment>('Department', DepartmentSchema)