import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDailyReportByType {
  cementType: "42.5" | "32.5";
  bags: number;
  revenue: number;
}

export interface IDailyReport extends Document {
  _id: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;
  reportDate: Date;
  totalBags: number;
  totalRevenue: number;
  byCementType: IDailyReportByType[];
  advancePaymentsCount: number;
  advancePaymentsAmount: number;
  submittedAt: Date;
  isLate: boolean;
  lateByMinutes: number;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const DailyReportSchema = new Schema<IDailyReport>(
  {
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Seller is required"],
      index: true,
    },
    reportDate: {
      type: Date,
      required: [true, "Report date is required"],
      index: true,
    },
    totalBags: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    totalRevenue: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    byCementType: {
      type: [
        {
          cementType: { type: String, enum: ["42.5", "32.5"], required: true },
          bags: { type: Number, required: true, default: 0, min: 0 },
          revenue: { type: Number, required: true, default: 0, min: 0 },
        },
      ],
      default: [],
    },
    advancePaymentsCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    advancePaymentsAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    submittedAt: {
      type: Date,
      required: true,
      index: true,
    },
    isLate: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
    lateByMinutes: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

DailyReportSchema.index({ sellerId: 1, reportDate: 1 }, { unique: true });
DailyReportSchema.index({ reportDate: 1, isLate: 1 });

const DailyReport: Model<IDailyReport> =
  mongoose.models.DailyReport ||
  mongoose.model<IDailyReport>("DailyReport", DailyReportSchema);

export default DailyReport;

