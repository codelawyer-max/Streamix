import Video from "../modals/video.js";
import Like from "../modals/like.js";

export const handlelike = async (req, res) => {
  const { userId } = req.body;
  const { videoId } = req.params;

  try {
    const existingLike = await Like.findOne({
      viewer: userId,
      videoid: videoId,
    });

    if (existingLike) {
      await Like.findByIdAndDelete(existingLike._id);

      await Video.findByIdAndUpdate(videoId, {
        $inc: { Like: -1 },
      });

      return res.status(200).json({
        liked: false,
      });
    }

    await Like.create({
      viewer: userId,
      videoid: videoId,
    });

    await Video.findByIdAndUpdate(videoId, {
      $inc: { Like: 1 },
    });

    return res.status(200).json({
      liked: true,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

export const getallLikedVideo = async (req, res) => {
  const { userId } = req.params;

  console.log("Received userId:", userId);

  try {
    const allLikes = await Like.find();
    console.log("All Likes:", allLikes);

    const likedVideos = await Like.find({
      viewer: userId,
    })
      .populate({
        path: "videoid",
        model: "videos",
      })
      .exec();

    console.log("Filtered Likes:", likedVideos);

    return res.status(200).json(likedVideos);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};
