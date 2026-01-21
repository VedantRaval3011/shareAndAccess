import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IFile extends Document {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  storageKey: string;
  checksum: string;
  uploadedAt: Date;
  uploadedBy?: string;
  parentId?: string | null;
  isFolder: boolean;
  passwordHash?: string;
  emoji?: string | null;
  recoveryOtp?: string;
  recoveryOtpExpires?: Date;
}

const FileSchema = new Schema<IFile>(
  {
    filename: {
      type: String,
      required: true,
      index: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    storageKey: {
      type: String,
      required: true,
      unique: true,
    },
    checksum: {
      type: String,
      required: true,
      index: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    uploadedBy: {
      type: String,
      default: null,
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'File',
      default: null,
      index: true,
    },
    isFolder: {
      type: Boolean,
      default: false,
    },
    passwordHash: {
      type: String,
    },
    emoji: {
      type: String,
      default: null,
    },
    recoveryOtp: {
      type: String,
    },
    recoveryOtpExpires: {
      type: Date,
    },
  },
  {
    timestamps: false,
  }
);

// Compound index for duplicate detection by filename + size + parentId
FileSchema.index({ originalName: 1, size: 1, parentId: 1 });

// Prevent model recompilation in development
const File: Model<IFile> =
  mongoose.models.File || mongoose.model<IFile>('File', FileSchema);

export default File;
