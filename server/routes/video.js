import express from "express";
import upload from "../filehelper/filehelper.js";

import {
  uploadVideo,
  getAllVideos,
  getVideoById,
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

router.get(
  "/:id",
  getVideoById
);

export default router;