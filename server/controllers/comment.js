import Comment from "../modals/comment.js";
import mongoose from "mongoose";

export const postcomment = async (req, res) => {
  try {
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
    });

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