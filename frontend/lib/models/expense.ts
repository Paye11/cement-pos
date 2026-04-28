import mongoose, { Schema, Document, Model } from "mongoose";
import type { CementType } from "./cement-price";

export type ExpenseStatus = "Pending" | "Approved" | "Rejected";

export interface IExpense extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  cementType: CementType;
  amount: number;
  note?: string;
  status: ExpenseStatus;
  requestedAt: Date;
  reviewedAt?: Date | null;
  reviewedBy?: mongoose.Types.ObjectId | null;
  rejectionReason?: string;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    cementType: {
      type: String,
      enum: ["42.5", "32.5"],
      required: [true, "Cement type is required"],
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [1, "Amount must be greater than zero"],
    },
    note: {
      type: String,
      trim: true,
      maxlength: [200, "Note cannot exceed 200 characters"],
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
      index: true,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: [200, "Rejection reason cannot exceed 200 characters"],
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

ExpenseSchema.index({ userId: 1, createdAt: -1 });
ExpenseSchema.index({ cementType: 1, createdAt: -1 });
ExpenseSchema.index({ status: 1, createdAt: -1 });
ExpenseSchema.index({ userId: 1, status: 1, createdAt: -1 });

const Expense: Model<IExpense> =
  mongoose.models.Expense || mongoose.model<IExpense>("Expense", ExpenseSchema);

export default Expense;

