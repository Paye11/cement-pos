import mongoose, { Schema, Document, Model } from "mongoose";

export type SellerDocumentCategory = "Receipt" | "Document";
export type SellerDocumentFileType = "image" | "pdf";
export type SellerDocumentRecipientType = "admin" | "seller";
export type SellerDocumentUploadedByRole = "user" | "admin";

export interface ISellerDocument extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  uploadedByRole: SellerDocumentUploadedByRole;
  uploadedBy: mongoose.Types.ObjectId;
  recipientType: SellerDocumentRecipientType;
  category: SellerDocumentCategory;
  title: string;
  fileType: SellerDocumentFileType;
  mimeType: string;
  url: string;
  publicId: string;
  bytes: number;
  format?: string;
  originalFilename?: string;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const SellerDocumentSchema = new Schema<ISellerDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    uploadedByRole: {
      type: String,
      enum: ["user", "admin"],
      required: [true, "Uploaded by role is required"],
      index: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Uploaded by is required"],
      index: true,
    },
    recipientType: {
      type: String,
      enum: ["admin", "seller"],
      required: [true, "Recipient type is required"],
      index: true,
    },
    category: {
      type: String,
      enum: ["Receipt", "Document"],
      required: [true, "Category is required"],
      index: true,
    },
    title: {
      type: String,
      trim: true,
      required: [true, "Title is required"],
      maxlength: [80, "Title cannot exceed 80 characters"],
    },
    fileType: {
      type: String,
      enum: ["image", "pdf"],
      required: [true, "File type is required"],
      index: true,
    },
    mimeType: {
      type: String,
      trim: true,
      required: [true, "MIME type is required"],
    },
    url: {
      type: String,
      trim: true,
      required: [true, "URL is required"],
    },
    publicId: {
      type: String,
      trim: true,
      required: [true, "Public ID is required"],
      index: true,
    },
    bytes: {
      type: Number,
      required: [true, "File size is required"],
      min: [1, "File size must be greater than zero"],
    },
    format: {
      type: String,
      trim: true,
    },
    originalFilename: {
      type: String,
      trim: true,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

SellerDocumentSchema.index({ userId: 1, createdAt: -1 });
SellerDocumentSchema.index({ userId: 1, category: 1, createdAt: -1 });
SellerDocumentSchema.index({ recipientType: 1, createdAt: -1 });
SellerDocumentSchema.index({ userId: 1, recipientType: 1, createdAt: -1 });
SellerDocumentSchema.index({ uploadedBy: 1, createdAt: -1 });

const SellerDocument: Model<ISellerDocument> =
  mongoose.models.SellerDocument ||
  mongoose.model<ISellerDocument>("SellerDocument", SellerDocumentSchema);

export default SellerDocument;

