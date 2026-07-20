import express from "express";
import {
  postcomment,
  getallcomment,
  deletecomment,
  editcomment,
} from "../controllers/comment.js";

const router = express.Router();

router.get("/:videoid", getallcomment);
router.post("/postcomment", postcomment);
router.delete("/deletecomment/:id", deletecomment);
router.post("/editcomment/:id", editcomment);

export default router;