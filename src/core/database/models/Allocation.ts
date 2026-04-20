import mongoose from 'mongoose'

export type AllocationStatus = 'ALLOCATED' | 'UNALLOCATED' | 'MANUALLY_ALLOCATED'
export type AllocatedBy = 'SYSTEM' | 'ALGORITHM' | 'HOD'

export interface IAllocationSlot {
  slot: number
  type: 'FIXED' | 'ELECTIVE'
  status: AllocationStatus
  course_id?: mongoose.Types.ObjectId
  preference_rank_given?: number
  score?: number
  allocated_by?: AllocatedBy
  hod_note?: string
}

export interface IAllocation {
  _id: mongoose.Types.ObjectId
  student_id: mongoose.Types.ObjectId
  department_id: mongoose.Types.ObjectId
  campus_id: mongoose.Types.ObjectId
  semester: number
  academic_year: string
  allocation_run_id: mongoose.Types.ObjectId
  total_credits: number
  slots: IAllocationSlot[]
  createdAt: Date
  updatedAt: Date
}

const AllocationSlotSchema = new mongoose.Schema<IAllocationSlot>(
  {
    slot: { type: Number, required: true },
    type: { type: String, required: true, enum: ['FIXED', 'ELECTIVE'] },
    status: {
      type: String,
      required: true,
      enum: ['ALLOCATED', 'UNALLOCATED', 'MANUALLY_ALLOCATED'],
    },
    course_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    preference_rank_given: { type: Number },
    score: { type: Number },
    allocated_by: { type: String, enum: ['SYSTEM', 'ALGORITHM', 'HOD'] },
    hod_note: { type: String },
  },
  { _id: false }
)

const AllocationSchema = new mongoose.Schema<IAllocation>(
  {
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    department_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    campus_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Campus', required: true },
    semester: { type: Number, required: true },
    academic_year: { type: String, required: true },
    allocation_run_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AllocationRun', required: true },
    total_credits: { type: Number, default: 0 },
    slots: { type: [AllocationSlotSchema], default: [] },
  },
  { timestamps: true }
)

AllocationSchema.index({ student_id: 1, semester: 1, academic_year: 1 }, { unique: true })
AllocationSchema.index({ department_id: 1, semester: 1, academic_year: 1 })

export const Allocation =
  (mongoose.models.Allocation as mongoose.Model<IAllocation>) ||
  mongoose.model<IAllocation>('Allocation', AllocationSchema)