import Video from "../modals/video.js";
import User from "../modals/auth.js";
import Download from "../modals/download.js";

const PLAN_RANK = {
  free: 0,
  bronze: 1,
  silver: 2,
  gold: 3,
};

// A paid plan that has expired counts as "free"
const getEffectivePlan = (user) => {
  const plan = PLAN_RANK[user?.plan] !== undefined ? user.plan : "free";

  if (
    plan !== "free" &&
    user.subscriptionEndDate &&
    new Date(user.subscriptionEndDate) < new Date()
  ) {
    return "free";
  }

  return plan;
};

export const uploadVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Please upload a valid video file.",
      });
    }

    const newVideo = new Video({
      videotitle: req.body.videotitle,
      filename: req.file.originalname,
      filepath: `uploads/${req.file.filename}`,
      filetype: req.file.mimetype,
      filesize: req.file.size,
      videochannel: req.body.videochannel,
      uploader: req.body.uploader,
      requiredPlan: req.body.requiredPlan || "free",
    });


    await newVideo.save();

    return res.status(201).json({
      message: "Video uploaded successfully.",
      result: newVideo,
    });
  } catch (error) {
    console.error("Video Upload Error:", error);

    return res.status(500).json({
      message: "Something went wrong while uploading the video.",
    });
  }
};

export const getAllVideos = async (req, res) => {
  try {
    const videos = await Video.find().sort({
      createdAt: -1,
    });

    return res.status(200).json({
      result: videos,
    });
  } catch (error) {
    console.error("Get Videos Error:", error);

    return res.status(500).json({
      message: "Something went wrong.",
    });
  }
};

export const getVideoById = async (req, res) => {
  const { id } = req.params;
  const { downloaded } = req.query;

  // Set by requireAuth from the login token, never from the URL
  const userId = req.userId;

  try {
    const video = await Video.findById(id);

    if (!video) {
      return res.status(404).json({
        message: "Video not found",
      });
    }

    const user = await User.findById(userId);

    const userPlan = getEffectivePlan(user);
    const requiredPlan =
      PLAN_RANK[video.requiredPlan] !== undefined ? video.requiredPlan : "free";

    // Normal subscription-based access
    const hasSubscriptionAccess =
      PLAN_RANK[userPlan] >= PLAN_RANK[requiredPlan];

    let hasDownloadedAccess = false;

    // If the request came from Downloads,
    // verify that this user actually downloaded this video.
    if (downloaded === "true") {
      const existingDownload = await Download.findOne({
        userId,
        videoId: id,
      });

      hasDownloadedAccess = !!existingDownload;
    }

    const hasAccess =
      hasSubscriptionAccess || hasDownloadedAccess;

    return res.status(200).json({
      result: video,
      hasAccess,
      hasSubscriptionAccess,
      hasDownloadedAccess,
    });

  } catch (error) {
    console.error("Get Video By ID Error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};
