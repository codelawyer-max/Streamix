import express from "express";

import {
  getAllHistoryVideo,
  handleHistory,
  handleView,
} from "../controllers/history.js";

const router = express.Router();

router.get("/:userId", getAllHistoryVideo);

router.post("/views/:videoId", handleView);

router.post("/:videoId", handleHistory);

export default router;