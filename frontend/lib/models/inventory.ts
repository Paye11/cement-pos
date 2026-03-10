import mongoose, { Schema, Document, Model } from "mongoose";
import type { CementType } from "./cement-price";

export interface IInventory extends Document {
  _id: mongoose.Types.ObjectId;
  cementType: CementType;
  totalStock: number;
  remainingStock: number;
  updatedAt: Date;
  createdAt: Date;
}

const InventorySchema = new Schema<IInventory>(
  {
    cementType: {
      type: String,
      enum: ["42.5", "32.5"],
      required: [true, "Cement type is required"],
      unique: true,
    },
    totalStock: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Total stock cannot be negative"],
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

const Inventory: Model<IInventory> =
  mongoose.models.Inventory ||
  mongoose.model<IInventory>("Inventory", InventorySchema);

export default Inventory;
