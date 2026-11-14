import mongoose from "mongoose";

// One document per pending login verification.
// The code itself is never stored: only an HMAC of it.
const otpSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    codeHash: {
      type: String,
      required: true,
    },

    // The device and location that is waiting to be approved
    deviceId: { type: String, required: true },
    deviceLabel: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },

    // Wrong guesses so far (limited), resends so far (limited)
    attempts: { type: Number, default: 0 },
    resends: { type: Number, default: 0 },

    lastSentAt: { type: Date, default: Date.now },

    expiresAt: { type: Date, required: true },
  },
  {
    timestamps: true,
  }
);

// MongoDB deletes the document automatically once expiresAt has passed
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("OTP", otpSchema);
