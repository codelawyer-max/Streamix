import express from "express";
import {
    downloadVideo,
    getUserDownloads,
} from "../controllers/download.js";

const router = express.Router();

router.post("/", downloadVideo);

router.get("/:userId", getUserDownloads);

export default router;