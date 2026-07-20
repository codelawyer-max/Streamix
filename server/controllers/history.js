import History from "../modals/history.js";
import Video from "../modals/video.js";

export const handleHistory = async (req, res) => {
  const { userId } = req.body;
  const { videoId } = req.params;

  try {
    await History.create({
      viewer: userId,
      videoid: videoId,
    });

    await Video.findByIdAndUpdate(videoId, {
      $inc: {
        views: 1,
      },
    });

    return res.status(200).json({
      history: true,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

export const handleView = async (req, res) => {
  const { videoId } = req.params;

  try {
    await Video.findByIdAndUpdate(videoId, {
      $inc: {
        views: 1,
      },
    });

    return res.status(200).json({
      success: true,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

export const getAllHistoryVideo = async (req, res) => {
  const { userId } = req.params;

  try {
    const historyVideos = await History.find({
      viewer: userId,
    })
      .populate({
        path: "videoid",
        model: "videos",
      })
      .exec();

    return res.status(200).json(historyVideos);
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};