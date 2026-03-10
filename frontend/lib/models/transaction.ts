import mongoose, { Schema, Document, Model } from "mongoose";
import type { CementType } from "./cement-price";

export type TransactionStatus = "Pending" | "Approved" | "Rejected";

export interface ITransaction extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  cementType: CementType;
  bagsSold: number;
  pricePerBag: number; // Stored in cents
  totalAmount: number; // Stored in cents
  status: TransactionStatus;
  rejectionReason?: string;
  approvedBy?: mongoose.Types.ObjectId;
  approvalDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
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
    bagsSold: {
      type: Number,
      required: [true, "Number of bags is required"],
      min: [1, "At least 1 bag must be sold"],
    },
    pricePerBag: {
      type: Number,
      required: [true, "Price per bag is required"],
      min: [0, "Price cannot be negative"],
    },
    totalAmount: {
      type: Number,
      required: [true, "Total amount is required"],
      min: [0, "Total amount cannot be negative"],
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    approvalDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
TransactionSchema.index({ userId: 1, createdAt: -1 });
TransactionSchema.index({ status: 1, createdAt: -1 });

const Transaction: Model<ITransaction> =
  mongoose.models.Transaction ||
  mongoose.model<ITransaction>("Transaction", TransactionSchema);

export default Transaction;
