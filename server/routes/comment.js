import express from "express";
import {
  postcomment,
  getallcomment,
  deletecomment,
  editcomment,
  likeComment,
  dislikeComment,
  reportComment,
  translateComment,
} from "../controllers/comment.js";

const router = express.Router();
router.post("/translate", translateComment);
router.get("/:videoid", getallcomment);
router.post("/postcomment", postcomment);
router.delete("/deletecomment/:id", deletecomment);
router.post("/editcomment/:id", editcomment);
router.post("/like/:id", likeComment);
router.post("/dislike/:id", dislikeComment);
router.post("/report/:id", reportComment);
router.post(
  "/translate",
  translateComment
);

export default router;