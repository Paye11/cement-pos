import mongoose, { Schema, Document, Model } from "mongoose";
import type { CementType } from "./cement-price";

export type TransactionEventType = "Submitted" | "Approved" | "Rejected" | "Delivered";

export interface ITransactionEvent extends Document {
  _id: mongoose.Types.ObjectId;
  transactionId: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;
  cementType: CementType;
  bagsSold: number;
  totalAmount: number;
  eventType: TransactionEventType;
  performedBy: mongoose.Types.ObjectId;
  rejectionReason?: string;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionEventSchema = new Schema<ITransactionEvent>(
  {
    transactionId: {
      type: Schema.Types.ObjectId,
      ref: "Transaction",
      required: [true, "Transaction ID is required"],
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Seller ID is required"],
    },
    cementType: {
      type: String,
      enum: ["42.5", "32.5"],
      required: [true, "Cement type is required"],
    },
    bagsSold: {
      type: Number,
      required: [true, "Bags sold is required"],
      min: [1, "Bags sold must be greater than zero"],
    },
    totalAmount: {
      type: Number,
      required: [true, "Total amount is required"],
      min: [0, "Total amount cannot be negative"],
    },
    eventType: {
      type: String,
      enum: ["Submitted", "Approved", "Rejected", "Delivered"],
      required: [true, "Event type is required"],
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Performed by is required"],
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

TransactionEventSchema.index({ sellerId: 1, createdAt: -1 });
TransactionEventSchema.index({ transactionId: 1, createdAt: -1 });
TransactionEventSchema.index({ deletedAt: 1, createdAt: -1 });

const TransactionEvent: Model<ITransactionEvent> =
  mongoose.models.TransactionEvent ||
  mongoose.model<ITransactionEvent>("TransactionEvent", TransactionEventSchema);

export default TransactionEvent;

