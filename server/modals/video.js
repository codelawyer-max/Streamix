import mongoose from "mongoose";

const videoSchema = new mongoose.Schema(
  {
    videotitle: {
      type: String,
      required: true,
    },

    filename: {
      type: String,
      required: true,
    },

    filepath: {
      type: String,
      required: true,
    },

    filetype: {
      type: String,
      required: true,
    },

    filesize: {
      type: Number,
      required: true,
    },

    videochannel: {
      type: String,
      required: true,
    },

    uploader: {
      type: String,
      required: true,
    },

    like: {
      type: Number,
      default: 0,
    },

    views: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Change "videofiles" to "videos" to target the collection that contains your data
export default mongoose.model("videos", videoSchema);
