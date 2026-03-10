
import mongoose, { Schema, Document, Model } from "mongoose";
import type { CementType } from "./cement-price";

export interface IUserInventory extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  cementType: CementType;
  totalAssigned: number;
  remainingStock: number;
  updatedAt: Date;
  createdAt: Date;
}

const UserInventorySchema = new Schema<IUserInventory>(
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
    totalAssigned: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Total assigned stock cannot be negative"],
    },
    remainingStock: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Remaining stock cannot be negative"],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure one inventory record per user per cement type
UserInventorySchema.index({ userId: 1, cementType: 1 }, { unique: true });

const UserInventory: Model<IUserInventory> =
  mongoose.models.UserInventory ||
  mongoose.model<IUserInventory>("UserInventory", UserInventorySchema);

export default UserInventory;
