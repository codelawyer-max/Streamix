import express from "express";
import upload from "../filehelper/filehelper.js";

import {
  uploadVideo,
  getAllVideos,
} from "../controllers/video.js";

const router = express.Router();

router.post(
  "/upload",
  upload.single("file"),
  uploadVideo
);

router.get(
  "/getall",
  getAllVideos
);

export default router;