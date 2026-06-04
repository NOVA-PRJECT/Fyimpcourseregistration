import mongoose from 'mongoose'

export interface ICampus {
  _id: mongoose.Types.ObjectId
  name: string
  code: string
  createdAt: Date
  updatedAt: Date
}

const CampusSchema = new mongoose.Schema<ICampus>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  },
  { timestamps: true, collection: 'campuses' }
)

export const Campus =
  (mongoose.models.Campus as mongoose.Model<ICampus>) ||
  mongoose.model<ICampus>('Campus', CampusSchema)