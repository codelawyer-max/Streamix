import Comment from "../modals/comment.js";
import mongoose from "mongoose";
import { moderateComment } from "../utils/commentModeration.js";
import axios from "axios";

export const postcomment = async (req, res) => {
  try {
    const moderationResult = moderateComment(req.body.commentbody);

    if (!moderationResult.allowed) {
      return res.status(400).json({
        message: moderationResult.message,
      });
    }
    const newComment = new Comment(req.body);
    await newComment.save();

    res.status(200).json({
      comment: true,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Something went wrong",
    });
  }
};

export const getallcomment = async (req, res) => {
  try {
    const comments = await Comment.find({
      videoid: req.params.videoid,
    }).populate(
      "userid",
      "name image location showLocation"
    );
    console.log("USER DATA:", comments[0].userid);

    res.status(200).json(comments);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Something went wrong",
    });
  }
};

export const deletecomment = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id))
    return res.status(404).send("Comment not found");

  try {
    await Comment.findByIdAndDelete(id);

    res.status(200).json({
      comment: true,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Something went wrong",
    });
  }
};

export const editcomment = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id))
    return res.status(404).send("Comment not found");

  try {
    const updated = await Comment.findByIdAndUpdate(
      id,
      {
        $set: {
          commentbody: req.body.commentbody,
        },
      },
      { new: true }
    );

    res.status(200).json(updated);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Something went wrong",
    });
  }
};

export const likeComment = async (req, res) => {
  const { id } = req.params;
  const { userid } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({
      message: "Comment not found",
    });
  }

  try {
    const comment = await Comment.findById(id);

    if (!comment) {
      return res.status(404).json({
        message: "Comment not found",
      });
    }

    const alreadyLiked = comment.likes.includes(userid);

    if (alreadyLiked) {
      // Remove like (toggle off)
      comment.likes = comment.likes.filter(
        (userId) => userId.toString() !== userid
      );
    } else {
      // Add like
      comment.likes.push(userid);

      // Remove dislike if present
      comment.dislikes = comment.dislikes.filter(
        (userId) => userId.toString() !== userid
      );
    }

    await comment.save();

    res.status(200).json(comment);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Something went wrong",
    });
  }
};

export const dislikeComment = async (req, res) => {
  const { id } = req.params;
  const { userid } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({
      message: "Comment not found",
    });
  }

  try {
    const comment = await Comment.findById(id);

    if (!comment) {
      return res.status(404).json({
        message: "Comment not found",
      });
    }

    const alreadyDisliked = comment.dislikes.includes(userid);

    if (alreadyDisliked) {
      // Remove dislike (toggle off)
      comment.dislikes = comment.dislikes.filter(
        (userId) => userId.toString() !== userid
      );
    } else {
      // Add dislike
      comment.dislikes.push(userid);

      // Remove like if present
      comment.likes = comment.likes.filter(
        (userId) => userId.toString() !== userid
      );
    }

    await comment.save();

    res.status(200).json(comment);

  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Something went wrong",
    });
  }
};

export const reportComment = async (req, res) => {
  const { id } = req.params;
  const { userid } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({
      message: "Comment not found",
    });
  }

  try {
    const comment = await Comment.findById(id);

    if (!comment) {
      return res.status(404).json({
        message: "Comment not found",
      });
    }


    const alreadyReported = comment.reports.some(
      (report) => report.user.toString() === userid
    );


    if (alreadyReported) {
      return res.status(400).json({
        message: "Already reported",
      });
    }


    comment.reports.push({
      user: userid,
    });


    comment.status = "flagged";


    await comment.save();


    res.status(200).json(comment);


  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Something went wrong",
    });
  }
};

export const translateComment = async (req, res) => {
  const { text, targetLanguage } = req.body;

  if (!text || !targetLanguage) {
    return res.status(400).json({
      message: "Text and target language are required.",
    });
  }

  try {
    const response = await axios.get(
      "https://api.mymemory.translated.net/get",
      {
        params: {
          q: text,
          langpair: `en|${targetLanguage}`,
        },
      }
    );

    return res.status(200).json({
      translatedText:
        response.data.responseData.translatedText,
    });

  } catch (error) {
    console.log("Translation error:", error);

    return res.status(500).json({
      message: "Translation failed.",
    });
  }
};