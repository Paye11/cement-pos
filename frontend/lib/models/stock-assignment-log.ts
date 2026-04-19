import mongoose, { Schema, Document, Model } from "mongoose";
import type { CementType } from "./cement-price";

export type StockAssignmentAction = "add" | "remove";

export interface IStockAssignmentLog extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  cementType: CementType;
  action: StockAssignmentAction;
  amount: number;
  performedBy: mongoose.Types.ObjectId;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const StockAssignmentLogSchema = new Schema<IStockAssignmentLog>(
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
    action: {
      type: String,
      enum: ["add", "remove"],
      required: [true, "Action is required"],
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [1, "Amount must be greater than zero"],
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Performed by is required"],
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

StockAssignmentLogSchema.index({ userId: 1, createdAt: -1 });
StockAssignmentLogSchema.index({ deletedAt: 1, createdAt: -1 });

const StockAssignmentLog: Model<IStockAssignmentLog> =
  mongoose.models.StockAssignmentLog ||
  mongoose.model<IStockAssignmentLog>("StockAssignmentLog", StockAssignmentLogSchema);

export default StockAssignmentLog;

