"use client";

import React, { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  ThumbsUp,
  ThumbsDown,
  Share2,
  Download,
  MoreHorizontal,
  Clock,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import axiosInstance from "@/lib/AxiosInstance";
import { useUser } from "@/lib/AuthContext";
import Link from "next/link";

interface VideoInfoProps {
  video: {
    _id: string;
    videotitle: string;
    filepath: string;
    videochannel?: string;
    videochanel?: string;
    views: number;
    Like?: string[] | number;
    createdAt: string;
    requiredPlan?: "free" | "bronze" | "silver" | "gold";
  };
}

interface DownloadStatus {
  plan: string;
  planName?: string;
  unlimited: boolean;
  limit: number | null;
  usedToday: number;
  remaining: number | null;
}

// When axios uses responseType "blob", an error body arrives as a Blob.
// This reads the JSON message the server sent inside that Blob.
const readDownloadError = async (error: any): Promise<string> => {
  const data = error?.response?.data;

  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text());
      return parsed.message || "Download failed. Please try again.";
    } catch {
      return "Download failed. Please try again.";
    }
  }

  return (
    error?.response?.data?.message || "Download failed. Please try again."
  );
};

export default function VideoInfo({ video }: VideoInfoProps) {
  const { user } = useUser();

  const [likesCount, setLikesCount] = useState<number>(0);
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [isWatchLater, setIsWatchLater] = useState(false);
  const [dislikesCount, setDislikesCount] = useState<number>(0);
  const [isDisliked, setIsDisliked] = useState(false);

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadMessage, setDownloadMessage] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus | null>(
    null
  );

  const planRank = {
    free: 0,
    bronze: 1,
    silver: 2,
    gold: 3,
  };

  useEffect(() => {
    if (video) {
      const initialLikes = Array.isArray(video.Like)
        ? video.Like.length
        : Number(video.Like) || 0;

      setLikesCount(initialLikes);
      setDislikesCount(0);

      const currentUserId = user?.id || user?._id;

      if (currentUserId && Array.isArray(video.Like)) {
        setIsLiked(video.Like.includes(currentUserId));
      } else {
        setIsLiked(false);
      }

      setIsDisliked(false);
    }
  }, [video, user]);

  useEffect(() => {
    if (!video?._id) return;

    const handleViews = async () => {
      try {
        const currentUserId = user?.id || user?._id;

        if (currentUserId) {
          await axiosInstance.post(`/history/${video._id}`, {
            userId: currentUserId,
          });
        } else {
          await axiosInstance.post(`/history/views/${video._id}`);
        }
      } catch (error) {
        console.log(error);
      }
    };

    handleViews();
  }, [video?._id, user]);

  const fetchDownloadStatus = async () => {
    const currentUserId = user?.id || user?._id;

    if (!currentUserId) {
      setDownloadStatus(null);
      return;
    }

    try {
      const res = await axiosInstance.get(`/download/status/${currentUserId}`);
      setDownloadStatus(res.data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchDownloadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?._id]);

  const handleLike = async () => {
    const currentUserId = user?.id || user?._id;

    if (!currentUserId) {
      alert("Please login to like this video!");
      return;
    }

    try {
      await axiosInstance.post(`/like/${video._id}`, {
        userId: currentUserId,
      });

      if (isLiked) {
        setLikesCount((prev) => Math.max(0, prev - 1));
        setIsLiked(false);
      } else {
        setLikesCount((prev) => prev + 1);
        setIsLiked(true);
      }
    } catch (error) {
      console.error("Error updating like status:", error);
    }
  };

  const handleDislike = async () => {
    const currentUserId = user?.id || user?._id;

    if (!currentUserId) {
      alert("Please login first.");
      return;
    }

    try {
      const res = await axiosInstance.post(`/like/${video._id}`, {
        userId: currentUserId,
      });

      if (!res.data.liked) {
        if (isDisliked) {
          setDislikesCount((prev) => Math.max(0, prev - 1));
          setIsDisliked(false);
        } else {
          setDislikesCount((prev) => prev + 1);
          setIsDisliked(true);

          if (isLiked) {
            setLikesCount((prev) => Math.max(0, prev - 1));
            setIsLiked(false);
          }
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleWatchLater = async () => {
    const currentUserId = user?.id || user?._id;

    if (!currentUserId) {
      alert("Please login first.");
      return;
    }

    try {
      const res = await axiosInstance.post(`/watch/${video._id}`, {
        userId: currentUserId,
      });

      setIsWatchLater(res.data.watchlater);
    } catch (error) {
      console.log(error);
    }
  };

  const handleDownload = async () => {
    const currentUserId = user?.id || user?._id;

    if (!currentUserId) {
      setDownloadError("Please login before downloading.");
      return;
    }

    const userPlan = user?.plan || "free";
    const requiredPlan = video.requiredPlan || "free";

    const hasAccess =
      planRank[userPlan as keyof typeof planRank] >=
      planRank[requiredPlan as keyof typeof planRank];

    if (!hasAccess) {
      setDownloadError(
        `This video requires the ${requiredPlan} plan or higher.`
      );
      return;
    }

    // Quick check in the browser. The SERVER makes the real decision.
    if (
      downloadStatus &&
      !downloadStatus.unlimited &&
      downloadStatus.remaining === 0
    ) {
      setDownloadError(
        `You have used all ${downloadStatus.limit} download(s) for today. Upgrade your plan for more.`
      );
      return;
    }

    setIsDownloading(true);
    setDownloadMessage("");
    setDownloadError("");

    try {
      const response = await axiosInstance.post(
        "/download",
        {
          userId: currentUserId,
          videoId: video._id,
        },
        {
          responseType: "blob",
        }
      );

      const downloadUrl = window.URL.createObjectURL(response.data);

      // Keep the real file extension (mp4, webm, ...)
      const rawExtension =
        video.filepath?.split(".").pop()?.toLowerCase() || "mp4";
      const extension = /^[a-z0-9]{2,5}$/.test(rawExtension)
        ? rawExtension
        : "mp4";

      const safeTitle =
        (video.videotitle || "video")
          .replace(/[\\/:*?"<>|]+/g, "")
          .trim() || "video";

      const link = document.createElement("a");

      link.href = downloadUrl;
      link.download = `${safeTitle}.${extension}`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(downloadUrl);

      setDownloadMessage("Video downloaded successfully.");
    } catch (error) {
      console.error("Download Error:", error);

      // Shows the server's real reason (daily limit, plan required, ...)
      setDownloadError(await readDownloadError(error));
    } finally {
      setIsDownloading(false);
      fetchDownloadStatus();
    }
  };

  const renderTimeAgo = () => {
    try {
      if (!video?.createdAt) return "recently";

      const parsedDate = new Date(video.createdAt);

      if (isNaN(parsedDate.getTime())) return "recently";

      return formatDistanceToNow(parsedDate, {
        addSuffix: true,
      });
    } catch {
      return "recently";
    }
  };

  const channelName =
    video?.videochannel ||
    video?.videochanel ||
    "Unknown Channel";

  return (
    <div className="mt-4 space-y-4">

      {/* Title */}
      <h1 className="text-xl font-bold text-gray-900 leading-snug line-clamp-2">
        {video?.videotitle || "Untitled Video"}
      </h1>

      {/* Channel + Action Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-gray-100">

        {/* Channel */}
        <div className="flex items-center gap-3">

          <Avatar className="h-10 w-10 border">
            <AvatarFallback>
              {channelName[0] || "U"}
            </AvatarFallback>
          </Avatar>

          <div>
            <h2 className="font-semibold">
              {channelName}
            </h2>

            <p className="text-sm text-gray-500">
              Subscribers hidden
            </p>
          </div>

          <Button className="rounded-full ml-3">
            Subscribe
          </Button>

        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">

          {/* Like / Dislike */}
          <div className="flex items-center bg-gray-100 rounded-full">

            <Button
              variant="ghost"
              onClick={handleLike}
              className={`rounded-l-full ${isLiked ? "text-red-600" : ""
                }`}
            >
              <ThumbsUp
                className={`mr-2 h-4 w-4 ${isLiked ? "fill-current" : ""
                  }`}
              />

              {likesCount.toLocaleString()}
            </Button>

            <div className="w-px h-5 bg-gray-300" />

            <Button
              variant="ghost"
              onClick={handleDislike}
              className={`rounded-r-full ${isDisliked ? "text-red-600" : ""
                }`}
            >
              <ThumbsDown
                className={`h-4 w-4 ${isDisliked ? "fill-current" : ""
                  }`}
              />

              {dislikesCount > 0 && (
                <span className="ml-2">
                  {dislikesCount}
                </span>
              )}
            </Button>

          </div>

          {/* Watch Later */}
          <Button
            onClick={handleWatchLater}
            variant="secondary"
            className={`rounded-full ${isWatchLater
                ? "bg-red-100 text-red-600"
                : ""
              }`}
          >
            <Clock className="mr-2 h-4 w-4" />

            {isWatchLater
              ? "Saved"
              : "Watch Later"}
          </Button>

          {/* Share */}
          <Button
            variant="secondary"
            className="rounded-full"
          >
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>

          {/* Download */}
          <Button
            variant="secondary"
            className="rounded-full"
            onClick={handleDownload}
            disabled={isDownloading}
          >
            <Download className="mr-2 h-4 w-4" />

            {isDownloading
              ? "Downloading..."
              : "Download"}
          </Button>

          {/* More */}
          <Button
            variant="secondary"
            size="icon"
            className="rounded-full"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>

        </div>
      </div>

      {/* Download Success Message */}
      {downloadMessage && (
        <p className="text-sm font-medium text-green-600">
          {downloadMessage}
        </p>
      )}

      {/* Download Error / Plan Restriction */}
      {downloadError && (
        <p className="text-sm font-medium text-red-600">
          {downloadError}
        </p>
      )}

      {/* Today's download usage */}
      {downloadStatus && (
        <p className="text-xs text-gray-500">
          {downloadStatus.planName || downloadStatus.plan} plan:{" "}
          {downloadStatus.unlimited
            ? "unlimited downloads"
            : `${downloadStatus.usedToday} of ${downloadStatus.limit} downloads used today`}
          {!downloadStatus.unlimited && downloadStatus.remaining === 0 && (
            <>
              {" "}
              <Link
                href="/subscription"
                className="font-semibold text-red-600 hover:underline"
              >
                Upgrade for more
              </Link>
            </>
          )}
        </p>
      )}

      {/* Description */}
      <div className="bg-gray-50 rounded-xl p-4">

        <div className="font-semibold">
          {(video?.views ?? 0).toLocaleString()} views •{" "}
          {renderTimeAgo()}
        </div>

        <p className="mt-2 text-sm text-gray-700">
          This description is generated dynamically from your backend.
        </p>

      </div>

    </div>
  );
}
