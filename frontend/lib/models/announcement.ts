import mongoose, { Schema, Document, Model } from "mongoose";

export type AnnouncementStatus = "Active" | "Expired";

export interface IAnnouncement extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  message: string;
  status: AnnouncementStatus;
  expiresAt: Date;
  createdBy: mongoose.Types.ObjectId;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const AnnouncementSchema = new Schema<IAnnouncement>(
  {
    title: {
      type: String,
      trim: true,
      required: [true, "Title is required"],
      maxlength: [80, "Title cannot exceed 80 characters"],
    },
    message: {
      type: String,
      trim: true,
      required: [true, "Message is required"],
      maxlength: [800, "Message cannot exceed 800 characters"],
    },
    status: {
      type: String,
      enum: ["Active", "Expired"],
      default: "Active",
      index: true,
    },
    expiresAt: {
      type: Date,
      required: [true, "Expiry date is required"],
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Created by is required"],
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

AnnouncementSchema.index({ status: 1, expiresAt: 1, createdAt: -1 });
AnnouncementSchema.index({ deletedAt: 1, expiresAt: 1 });

const Announcement: Model<IAnnouncement> =
  mongoose.models.Announcement ||
  mongoose.model<IAnnouncement>("Announcement", AnnouncementSchema);

export default Announcement;

