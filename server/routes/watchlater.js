import express from "express";
import {
  handleWatchLater,
  getAllWatchLater,
} from "../controllers/watchlater.js";

const router = express.Router();

router.get("/:userId", getAllWatchLater);

router.post("/:videoId", handleWatchLater);

export default router;