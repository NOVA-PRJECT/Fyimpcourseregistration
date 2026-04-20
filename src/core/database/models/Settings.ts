import mongoose from 'mongoose'

export type AllocationStatus =
  | 'PENDING'
  | 'OPEN'
  | 'CLOSED'
  | 'RUNNING'
  | 'COMPLETED'

export interface ISettings {
  _id: mongoose.Types.ObjectId
  campus_id: mongoose.Types.ObjectId
  semester: number
  academic_year: string
  preference_window_open: boolean
  preference_deadline?: Date
  allocation_status: AllocationStatus
  allocation_run_id?: mongoose.Types.ObjectId
  min_credits: number
  max_credits: number
  createdAt: Date
  updatedAt: Date
}

const SettingsSchema = new mongoose.Schema<ISettings>(
  {
    campus_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Campus', required: true },
    semester: { type: Number, required: true },
    academic_year: { type: String, required: true },
    preference_window_open: { type: Boolean, default: false },
    preference_deadline: { type: Date },
    allocation_status: {
      type: String,
      required: true,
      enum: ['PENDING', 'OPEN', 'CLOSED', 'RUNNING', 'COMPLETED'],
      default: 'PENDING',
    },
    allocation_run_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AllocationRun' },
    min_credits: { type: Number, default: 18 },
    max_credits: { type: Number, default: 26 },
  },
  { timestamps: true }
)

SettingsSchema.index({ campus_id: 1, semester: 1, academic_year: 1 }, { unique: true })

export const Settings =
  (mongoose.models.Settings as mongoose.Model<ISettings>) ||
  mongoose.model<ISettings>('Settings', SettingsSchema)