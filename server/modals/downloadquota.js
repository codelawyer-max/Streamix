import mongoose from "mongoose";

// One document per user per IST day. It is the atomic counter that enforces
// the daily download limit, so two simultaneous requests can never both pass.
const downloadQuotaSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // IST calendar day, e.g. "2026-11-12"
    day: {
      type: String,
      required: true,
    },

    count: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

downloadQuotaSchema.index({ userId: 1, day: 1 }, { unique: true });

export default mongoose.model("DownloadQuota", downloadQuotaSchema);