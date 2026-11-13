import mongoose from "mongoose";

const downloadSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    videoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "videos",
      required: true,
    },

    // Plan the user had AT THE TIME of the download
    userPlan: {
      type: String,
      enum: ["free", "bronze", "silver", "gold"],
      required: true,
    },

    downloadDate: {
      type: Date,
      default: Date.now,
    },

    // IST calendar day of the download, e.g. "2026-11-12"
    dayKey: {
      type: String,
    },

    // Which download of that day this was (1st, 2nd, ...)
    dailyCount: {
      type: Number,
    },

    // Snapshot of the video details, so the history survives video deletion
    videoTitle: {
      type: String,
    },

    fileSize: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

downloadSchema.index({ userId: 1, downloadDate: -1 });

export default mongoose.model("Download", downloadSchema);