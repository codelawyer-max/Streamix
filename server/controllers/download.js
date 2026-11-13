import fs from "fs";
import path from "path";
import mongoose from "mongoose";

import Download from "../modals/download.js";
import DownloadQuota from "../modals/downloadquota.js";
import Video from "../modals/video.js";
import User from "../modals/auth.js";
import subscriptionPlans from "../utils/subscriptionPlans.js";

const PLAN_RANK = { free: 0, bronze: 1, silver: 2, gold: 3 };

// Used only if utils/subscriptionPlans.js has no downloadLimit for a plan
const DEFAULT_LIMITS = { free: 1, bronze: 3, silver: 5, gold: Infinity };

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// ------------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------------

// Calendar day in India, e.g. "2026-11-12".
// (The old code used the SERVER's timezone, which is UTC on Render, so
// the "day" reset at 5:30 AM IST instead of midnight.)
const istDayKey = (date = new Date()) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(date);

// The exact moment the next IST day starts
const nextISTMidnight = (dayKey) => {
    const [year, month, day] = dayKey.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day + 1) - IST_OFFSET_MS);
};

// A paid plan that has expired counts as "free"
const getEffectivePlan = (user) => {
    const plan = PLAN_RANK[user.plan] !== undefined ? user.plan : "free";

    if (
        plan !== "free" &&
        user.subscriptionEndDate &&
        new Date(user.subscriptionEndDate) < new Date()
    ) {
        return "free";
    }

    return plan;
};

const getPlanInfo = (planId) => {
    const config = subscriptionPlans?.[planId];
    const raw = config?.downloadLimit ?? DEFAULT_LIMITS[planId];

    // Infinity / negative / missing = unlimited
    const limit =
        typeof raw === "number" && Number.isFinite(raw) && raw >= 0
            ? raw
            : Infinity;

    return {
        id: planId,
        name: config?.name || planId.charAt(0).toUpperCase() + planId.slice(1),
        limit,
    };
};

// Atomically take one download "slot" for today.
// Returns the updated counter, or null if the daily limit is reached.
const reserveDownloadSlot = async (userId, day, limit) => {
    const cap = Number.isFinite(limit) ? limit : Number.MAX_SAFE_INTEGER;

    if (cap <= 0) return null;

    // Make sure today's counter exists (ignore the duplicate-key race)
    try {
        await DownloadQuota.updateOne(
            { userId, day },
            { $setOnInsert: { count: 0 } },
            { upsert: true }
        );
    } catch (error) {
        if (error.code !== 11000) throw error;
    }

    // Only increments while count < cap, in ONE atomic database operation
    return DownloadQuota.findOneAndUpdate(
        { userId, day, count: { $lt: cap } },
        { $inc: { count: 1 } },
        { new: true, returnDocument: "after" }
    );
};

const releaseDownloadSlot = async (userId, day) => {
    try {
        await DownloadQuota.updateOne(
            { userId, day, count: { $gt: 0 } },
            { $inc: { count: -1 } }
        );
    } catch (error) {
        console.error("Release download slot error:", error);
    }
};

// ------------------------------------------------------------------
// POST /download   { userId, videoId }
// ------------------------------------------------------------------

export const downloadVideo = async (req, res) => {
    const { userId, videoId } = req.body;

    if (!userId || !videoId) {
        return res.status(400).json({
            message: "User ID and Video ID are required",
        });
    }

    if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(videoId)) {
        return res.status(400).json({
            message: "Invalid user or video ID",
        });
    }

    let slotReserved = false;
    let day = istDayKey();

    try {
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const video = await Video.findById(videoId);

        if (!video) {
            return res.status(404).json({ message: "Video not found" });
        }

        // 1. Plan and access checks
        const userPlan = getEffectivePlan(user);
        const plan = getPlanInfo(userPlan);
        const requiredPlan = PLAN_RANK[video.requiredPlan] !== undefined
            ? video.requiredPlan
            : "free";

        if (PLAN_RANK[userPlan] < PLAN_RANK[requiredPlan]) {
            return res.status(403).json({
                code: "PLAN_REQUIRED",
                message: `This video requires the ${requiredPlan} plan or higher.`,
                userPlan,
                requiredPlan,
            });
        }

        // 2. Make sure the file really exists BEFORE using up a daily slot.
        //    (Paths saved on Windows contain backslashes, so normalise them.)
        const uploadsRoot = path.resolve(process.cwd(), "uploads");
        const relativePath = String(video.filepath || "").replace(/\\/g, "/");
        const filePath = path.resolve(process.cwd(), relativePath);

        if (
            !relativePath ||
            !filePath.startsWith(uploadsRoot + path.sep) ||
            !fs.existsSync(filePath)
        ) {
            return res.status(404).json({ message: "Video file not found" });
        }

        // 3. Atomically reserve today's download slot
        day = istDayKey();
        const quota = await reserveDownloadSlot(user._id, day, plan.limit);

        if (!quota) {
            const current = await DownloadQuota.findOne({ userId: user._id, day });

            return res.status(403).json({
                code: "DAILY_LIMIT_REACHED",
                message: `Daily download limit reached for your ${plan.name} plan (${plan.limit} per day). Upgrade your plan for more downloads.`,
                plan: userPlan,
                downloadLimit: plan.limit,
                downloadsUsed: current?.count ?? plan.limit,
                resetsAt: nextISTMidnight(day),
            });
        }

        slotReserved = true;

        // 4. Record the download (count, date, plan, video details)
        const record = await Download.create({
            userId: user._id,
            videoId: video._id,
            userPlan,
            dayKey: day,
            dailyCount: quota.count,
            videoTitle: video.videotitle,
            fileSize: video.filesize,
        });

        // 5. Send the file
        const extension = path.extname(filePath) || ".mp4";
        const safeTitle =
            String(video.videotitle || "video")
                .replace(/[\\/:*?"<>|]+/g, "")
                .trim()
                .slice(0, 100) || "video";

        return res.download(filePath, `${safeTitle}${extension}`, async (error) => {
            if (!error) return;

            console.error("File Download Error:", error);

            // Nothing was sent -> give the slot back and remove the record
            if (!res.headersSent) {
                await releaseDownloadSlot(user._id, day);
                await Download.deleteOne({ _id: record._id }).catch(() => {});

                res.status(500).json({
                    message: "The file could not be sent. Please try again.",
                });
            }
        });
    } catch (error) {
        console.error("Download Error:", error);

        if (slotReserved) {
            await releaseDownloadSlot(userId, day);
        }

        return res.status(500).json({
            message: "Something went wrong while processing the download.",
        });
    }
};

// ------------------------------------------------------------------
// GET /download/status/:userId   -> today's usage and limit
// ------------------------------------------------------------------

export const getDownloadStatus = async (req, res) => {
    const { userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
    }

    try {
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const userPlan = getEffectivePlan(user);
        const plan = getPlanInfo(userPlan);
        const day = istDayKey();

        const quota = await DownloadQuota.findOne({ userId: user._id, day });
        const usedToday = quota?.count ?? 0;
        const unlimited = !Number.isFinite(plan.limit);

        return res.status(200).json({
            plan: userPlan,
            planName: plan.name,
            unlimited,
            limit: unlimited ? null : plan.limit,
            usedToday,
            remaining: unlimited ? null : Math.max(0, plan.limit - usedToday),
            resetsAt: nextISTMidnight(day),
        });
    } catch (error) {
        console.error("Download Status Error:", error);

        return res.status(500).json({
            message: "Something went wrong while fetching download status.",
        });
    }
};

// ------------------------------------------------------------------
// GET /download/:userId   -> the Downloads list
// ------------------------------------------------------------------

export const getUserDownloads = async (req, res) => {
    const { userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
    }

    try {
        const downloads = await Download.find({ userId })
            .populate({
                path: "videoId",
                select:
                    "videotitle filename filepath filesize videochannel videochanel uploader",
            })
            .sort({ downloadDate: -1 })
            .limit(200)
            .lean();

        return res.status(200).json({
            result: downloads,
        });
    } catch (error) {
        console.error("Get Downloads Error:", error);

        return res.status(500).json({
            message: "Something went wrong while fetching downloads.",
        });
    }
};