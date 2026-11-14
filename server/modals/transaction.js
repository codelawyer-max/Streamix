import mongoose from "mongoose";

// One document per payment attempt. Created when the order is created
// (status "created") and flipped to "paid" once the signature is verified.
const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // The plan and amount are decided by the SERVER when the order is made.
    // verify-payment reads them from here, never from the browser.
    plan: {
      type: String,
      enum: ["bronze", "silver", "gold"],
      required: true,
    },

    amount: {
      type: Number, // rupees
      required: true,
    },

    currency: {
      type: String,
      default: "INR",
    },

    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
    },

    // unique + sparse: the same payment can never be applied twice
    razorpayPaymentId: {
      type: String,
      unique: true,
      sparse: true,
    },

    status: {
      type: String,
      enum: ["created", "paid", "failed"],
      default: "created",
    },

    paidAt: { type: Date },

    planStartDate: { type: Date },

    planEndDate: { type: Date },

    invoiceNumber: { type: String },

    emailSent: { type: Boolean, default: false },

    emailError: { type: String },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Transaction", transactionSchema);