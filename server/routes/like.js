import express from "express";
import { handlelike, getallLikedVideo } from "../controllers/like.js";

const router = express.Router();

router.get("/:userId", getallLikedVideo);
router.post("/:videoId", handlelike);

export default router;