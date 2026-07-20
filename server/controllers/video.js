import Video from "../modals/video.js";

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