import mongoose, { Schema, Document, Model } from "mongoose";

export type CementType = "42.5" | "32.5";

export interface ICementPrice extends Document {
  _id: mongoose.Types.ObjectId;
  cementType: CementType;
  pricePerBag: number; // Stored in cents to avoid floating-point issues
  updatedAt: Date;
  createdAt: Date;
}

const CementPriceSchema = new Schema<ICementPrice>(
  {
    cementType: {
      type: String,
      enum: ["42.5", "32.5"],
      required: [true, "Cement type is required"],
      unique: true,
    },
    pricePerBag: {
      type: Number,
      required: [true, "Price per bag is required"],
      min: [0, "Price cannot be negative"],
    },
  },
  {
    timestamps: true,
  }
);

const CementPrice: Model<ICementPrice> =
  mongoose.models.CementPrice ||
  mongoose.model<ICementPrice>("CementPrice", CementPriceSchema);

export default CementPrice;
