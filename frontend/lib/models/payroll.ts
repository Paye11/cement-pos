import mongoose, { Schema, Document, Model } from "mongoose";

export type PayrollType = "Seller" | "StoreBoy";
export type PayrollStatus = "Pending" | "Approved";

export interface IPayroll extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  payrollType: PayrollType;
  amount: number;
  month: number;
  year: number;
  status: PayrollStatus;
  approvedBy?: mongoose.Types.ObjectId;
  approvalDate?: Date;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const PayrollSchema = new Schema<IPayroll>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    payrollType: {
      type: String,
      enum: ["Seller", "StoreBoy"],
      required: [true, "Payroll type is required"],
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount cannot be negative"],
    },
    month: {
      type: Number,
      required: [true, "Month is required"],
      min: [1, "Month must be between 1 and 12"],
      max: [12, "Month must be between 1 and 12"],
    },
    year: {
      type: Number,
      required: [true, "Year is required"],
      min: [2000, "Year is invalid"],
      max: [2100, "Year is invalid"],
    },
    status: {
      type: String,
      enum: ["Pending", "Approved"],
      default: "Pending",
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    approvalDate: {
      type: Date,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

PayrollSchema.index({ userId: 1, month: 1, year: 1, payrollType: 1 });
PayrollSchema.index({ status: 1, month: 1, year: 1 });
PayrollSchema.index({ deletedAt: 1, createdAt: -1 });

const Payroll: Model<IPayroll> =
  mongoose.models.Payroll || mongoose.model<IPayroll>("Payroll", PayrollSchema);

export default Payroll;

