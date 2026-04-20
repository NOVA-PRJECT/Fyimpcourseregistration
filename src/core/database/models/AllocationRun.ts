import mongoose from 'mongoose'

export interface IAllocationRun {
  _id: mongoose.Types.ObjectId
  semester: number
  academic_year: string
  campus_id: mongoose.Types.ObjectId
  triggered_by: mongoose.Types.ObjectId
  triggered_at: Date
  completed_at?: Date
  status: 'RUNNING' | 'COMPLETED' | 'FAILED'
  summary?: {
    total_students: number
    fully_allocated: number
    partially_allocated: number
    unallocated: number
    total_slots_allocated: number
    total_slots_unallocated: number
  }
  error?: string
  createdAt: Date
  updatedAt: Date
}

const AllocationRunSchema = new mongoose.Schema<IAllocationRun>(
  {
    semester: { type: Number, required: true },
    academic_year: { type: String, required: true },
    campus_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Campus', required: true },
    triggered_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    triggered_at: { type: Date, default: Date.now },
    completed_at: { type: Date },
    status: {
      type: String,
      required: true,
      enum: ['RUNNING', 'COMPLETED', 'FAILED'],
      default: 'RUNNING',
    },
    summary: {
      total_students: Number,
      fully_allocated: Number,
      partially_allocated: Number,
      unallocated: Number,
      total_slots_allocated: Number,
      total_slots_unallocated: Number,
    },
    error: { type: String },
  },
  { timestamps: true }
)

export const AllocationRun =
  (mongoose.models.AllocationRun as mongoose.Model<IAllocationRun>) ||
  mongoose.model<IAllocationRun>('AllocationRun', AllocationRunSchema)