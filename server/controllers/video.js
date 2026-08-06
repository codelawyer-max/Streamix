import Video from "../modals/video.js";
import User from "../modals/auth.js";

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
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({
      message: "User ID required",
    });
  }

  try {

    const video = await Video.findById(id);

    if (!video) {
      return res.status(404).json({
        message: "Video not found",
      });
    }

    const user = await User.findById(userId);

    const planRank = {
      free: 0,
      bronze: 1,
      silver: 2,
      gold: 3,
    };

    const userPlan = user?.plan || "free";
    const requiredPlan = video.requiredPlan || "free";

    const hasAccess =
      planRank[userPlan] >=
      planRank[requiredPlan];

    return res.status(200).json({
      result: video,
      hasAccess,
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });

  }

};