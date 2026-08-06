import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    userid: {
      type: mongoose.Schema.Types.ObjectId,
     ref: "User",
      required: true,
    },

    videoid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "videofiles",
      required: true,
    },

    commentbody: {
      type: String,
      required: true,
    },

    usercommented: {
      type: String,
      required: true,
    },

    location: {
      type: String,
      default: "",
    },

    showLocation: {
      type: Boolean,
      default: false,
    },

    commentedon: {
      type: Date,
      default: Date.now,
    },

    // Users who liked this comment
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
      },
    ],

    // Users who disliked this comment
    dislikes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
      },
    ],

    // Users who reported this comment
    reports: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "user",
        },
        reportedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Moderation status
    status: {
      type: String,
      enum: ["active", "flagged"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("comment", commentSchema);