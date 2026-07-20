import WatchLater from "../modals/watchlater.js";

export const handleWatchLater = async (req, res) => {
  const { userId } = req.body;
  const { videoId } = req.params;

  try {
    const existing = await WatchLater.findOne({
      viewer: userId,
      videoid: videoId,
    });

    if (existing) {
      await WatchLater.findByIdAndDelete(existing._id);

      return res.status(200).json({
        watchlater: false,
      });
    }

    await WatchLater.create({
      viewer: userId,
      videoid: videoId,
    });

    return res.status(200).json({
      watchlater: true,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong.",
    });
  }
};

export const getAllWatchLater = async (req, res) => {
  const { userId } = req.params;

  try {
    const videos = await WatchLater.find({
      viewer: userId,
    })
      .populate({
        path: "videoid",
        model: "videos",
      })
      .exec();

    return res.status(200).json(videos);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong.",
    });
  }
};