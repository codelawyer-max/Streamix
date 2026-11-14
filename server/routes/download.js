import express from "express";
import {
    downloadVideo,
    getDownloadStatus,
    getUserDownloads,
} from "../controllers/download.js";
import { requireAuth, requireSelf } from "../middleware/auth.js";

const router = express.Router();

router.post("/", requireAuth, downloadVideo);

// Must come BEFORE "/:userId", otherwise "status" is read as a user id
router.get(
    "/status/:userId",
    requireAuth,
    requireSelf("userId"),
    getDownloadStatus
);

router.get(
    "/:userId",
    requireAuth,
    requireSelf("userId"),
    getUserDownloads
);

export default router;
