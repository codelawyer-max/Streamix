import express from "express";
import {
    downloadVideo,
    getDownloadStatus,
    getUserDownloads,
} from "../controllers/download.js";

const router = express.Router();

router.post("/", downloadVideo);

// Must come BEFORE "/:userId", otherwise "status" is read as a user id
router.get("/status/:userId", getDownloadStatus);

router.get("/:userId", getUserDownloads);

export default router;