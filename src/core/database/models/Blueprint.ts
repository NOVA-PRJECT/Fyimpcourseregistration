import mongoose from 'mongoose'

export type SlotRule =
  | 'FIXED'
  | 'DEPT_RESTRICTED'
  | 'EXCLUDE_DEPT'
  | 'POOL_RESTRICTED'
  | 'GLOBAL_BASKET'

export interface ISlot {
  slot: number
  rule: SlotRule
  target: string
  name: string
}

export interface IBlueprint {
  _id: mongoose.Types.ObjectId
  department_id: mongoose.Types.ObjectId
  semester: number
  min_credits: number
  max_credits: number
  slots: ISlot[]
  createdAt: Date
  updatedAt: Date
}

const SlotSchema = new mongoose.Schema<ISlot>(
  {
    slot: { type: Number, required: true },
    rule: {
      type: String,
      required: true,
      enum: ['FIXED', 'DEPT_RESTRICTED', 'EXCLUDE_DEPT', 'POOL_RESTRICTED', 'GLOBAL_BASKET'],
    },
    target: { type: String, required: true },
    name: { type: String, required: true },
  },
  { _id: false }
)

const BlueprintSchema = new mongoose.Schema<IBlueprint>(
  {
    department_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    semester: { type: Number, required: true, min: 1, max: 10 },
    min_credits: { type: Number, default: 18 },
    max_credits: { type: Number, default: 26 },
    slots: { type: [SlotSchema], default: [] },
  },
  { timestamps: true }
)

BlueprintSchema.index({ department_id: 1, semester: 1 }, { unique: true })

export const Blueprint =
  (mongoose.models.Blueprint as mongoose.Model<IBlueprint>) ||
  mongoose.model<IBlueprint>('Blueprint', BlueprintSchema)