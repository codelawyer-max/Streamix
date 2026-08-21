import fs from "fs";
import path from "path";

import Download from "../modals/download.js";
import Video from "../modals/video.js";
import User from "../modals/auth.js";
import subscriptionPlans from "../utils/subscriptionPlans.js";

export const downloadVideo = async (req, res) => {
    const { userId, videoId } = req.body;

    if (!userId || !videoId) {
        return res.status(400).json({
            message: "User ID and Video ID are required",
        });
    }

    try {
        const user = await User.findById(userId);
        const video = await Video.findById(videoId);

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        if (!video) {
            return res.status(404).json({
                message: "Video not found",
            });
        }

        const userPlan = user.plan || "free";

        const planDetails = subscriptionPlans[userPlan];

        const planRank = {
            free: 0,
            bronze: 1,
            silver: 2,
            gold: 3,
        };

        const requiredPlan = video.requiredPlan || "free";

        if (planRank[userPlan] < planRank[requiredPlan]) {
            return res.status(403).json({
                message: `This video requires ${requiredPlan} plan or higher.`,
                userPlan,
                requiredPlan,
            });
        }

        if (!planDetails) {
            return res.status(400).json({
                message: "Invalid subscription plan",
            });
        }

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const downloadCount = await Download.countDocuments({
            userId,
            downloadedAt: {
                $gte: startOfDay,
                $lte: endOfDay,
            },
        });

        if (downloadCount >= planDetails.downloadLimit) {
            return res.status(403).json({
                message: `Daily download limit reached for your ${planDetails.name} plan.`,
                downloadLimit: planDetails.downloadLimit,
                downloadsUsed: downloadCount,
            });
        }

        const filePath = path.join(
            process.cwd(),
            video.filepath
        );

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                message: "Video file not found",
            });
        }

        await Download.create({
            userId,
            videoId,
            userPlan,
        });

        return res.download(
            filePath,
            video.filename,
            (error) => {
                if (error) {
                    console.error("File Download Error:", error);
                }
            }
        );

    } catch (error) {
        console.error("Download Error:", error);

        return res.status(500).json({
            message: "Something went wrong while processing the download.",
        });
    }
};

export const getUserDownloads = async (req, res) => {
    const { userId } = req.params;

    if (!userId) {
        return res.status(400).json({
            message: "User ID is required",
        });
    }

    try {
        const downloads = await Download.find({ userId })
            .populate({
                path: "videoId",
                select: "videotitle filename filepath filesize videochannel uploader",
            })
            .sort({ downloadDate: -1 });

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