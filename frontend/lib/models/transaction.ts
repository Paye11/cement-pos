import mongoose, { Schema, Document, Model } from "mongoose";
import type { CementType } from "./cement-price";

export type TransactionStatus = "Pending" | "Approved" | "Rejected" | "Waiting for Delivery";
export type DeliveryStatus = "Pending" | "Partially Delivered" | "Fully Delivered";

export interface ITransaction extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  cementType: CementType;
  bagsSold: number;
  pricePerBag: number; // Stored in cents
  totalAmount: number; // Stored in cents
  status: TransactionStatus;
  isAdvancePayment: boolean;
  bagsDelivered: number;
  deliveryStatus: DeliveryStatus;
  isNegotiatedPrice: boolean;
  originalPricePerBag?: number;
  rejectionReason?: string;
  approvedBy?: mongoose.Types.ObjectId;
  approvalDate?: Date;
  deletedAt?: Date | null;
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
      enum: ["Pending", "Approved", "Rejected", "Waiting for Delivery"],
      default: "Pending",
    },
    isAdvancePayment: {
      type: Boolean,
      default: false,
    },
    bagsDelivered: {
      type: Number,
      default: 0,
    },
    deliveryStatus: {
      type: String,
      enum: ["Pending", "Partially Delivered", "Fully Delivered"],
      default: "Pending",
    },
    isNegotiatedPrice: {
      type: Boolean,
      default: false,
    },
    originalPricePerBag: {
      type: Number,
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
    deletedAt: {
      type: Date,
      default: null,
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
