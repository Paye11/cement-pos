import mongoose, { Schema, Document, Model } from "mongoose";

export interface IHoliday extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  date: Date;
  createdBy?: mongoose.Types.ObjectId;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const HolidaySchema = new Schema<IHoliday>(
  {
    name: {
      type: String,
      trim: true,
      required: [true, "Holiday name is required"],
      maxlength: [120, "Holiday name cannot exceed 120 characters"],
    },
    date: {
      type: Date,
      required: [true, "Holiday date is required"],
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

HolidaySchema.index({ date: 1, deletedAt: 1 });

const Holiday: Model<IHoliday> =
  mongoose.models.Holiday || mongoose.model<IHoliday>("Holiday", HolidaySchema);

export default Holiday;

