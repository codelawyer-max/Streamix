import React, { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Download, Play, FileVideo } from "lucide-react";
import axiosInstance from "@/lib/AxiosInstance";
import { useUser } from "@/lib/AuthContext";

interface DownloadedVideo {
  _id: string;
  userPlan: string;
  downloadDate: string;
  dailyCount?: number;
  // Snapshot saved at download time (still available if the video is deleted)
  videoTitle?: string;
  fileSize?: number;
  // null when the original video no longer exists
  videoId: {
    _id: string;
    videotitle: string;
    filename: string;
    filepath: string;
    filesize: number;
    videochannel?: string;
    videochanel?: string;
    uploader: string;
  } | null;
}

interface DownloadStatus {
  plan: string;
  planName?: string;
  unlimited: boolean;
  limit: number | null;
  usedToday: number;
  remaining: number | null;
}

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export default function Downloads() {
  const { user } = useUser();

  const userId = user?._id || user?.id;

  const [downloads, setDownloads] = useState<DownloadedVideo[]>([]);
  const [status, setStatus] = useState<DownloadStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchDownloads = async () => {
      try {
        setLoading(true);
        setError("");

        const [listResponse, statusResponse] = await Promise.all([
          axiosInstance.get(`/download/${userId}`),
          axiosInstance.get(`/download/status/${userId}`),
        ]);

        if (cancelled) return;

        setDownloads(listResponse.data.result || []);
        setStatus(statusResponse.data);
      } catch (err) {
        console.error("Downloads Error:", err);
        if (!cancelled) setError("Unable to load your downloads.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchDownloads();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown size";

    const mb = bytes / (1024 * 1024);

    if (mb < 1024) {
      return `${mb.toFixed(1)} MB`;
    }

    return `${(mb / 1024).toFixed(1)} GB`;
  };

  const formatDownloadDate = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), {
        addSuffix: true,
      });
    } catch {
      return "Recently";
    }
  };

  const formatExactDate = (date: string) => {
    try {
      return new Date(date).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Kolkata",
      });
    } catch {
      return "";
    }
  };

  if (!userId && !loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">Downloads</h1>

        <p className="mt-4 text-gray-500">
          Please log in to see your downloads.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">Downloads</h1>

        <p className="mt-4 text-gray-500">
          Loading your downloads...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">Downloads</h1>

        <p className="mt-4 text-red-500">
          {error}
        </p>
      </div>
    );
  }

  const limitReached =
    status && !status.unlimited && (status.remaining ?? 0) === 0;

  return (
    <div className="p-4 sm:p-6">

      {/* Header */}

      <div className="flex items-center gap-3 mb-6">

        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
          <Download className="h-5 w-5 text-gray-700" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Downloads
          </h1>

          <p className="text-sm text-gray-500">
            Videos you&apos;ve downloaded
          </p>
        </div>

      </div>


      {/* Today's usage */}

      {status && (
        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">

          <div>
            <p className="text-sm font-semibold text-gray-900">
              {status.planName || status.plan} plan
            </p>

            <p className="mt-1 text-sm text-gray-600">
              {status.unlimited
                ? `Unlimited downloads (${status.usedToday} today)`
                : `${status.usedToday} of ${status.limit} downloads used today`}
            </p>

            {!status.unlimited && (
              <p className="mt-1 text-xs text-gray-400">
                Resets every day at midnight (IST)
              </p>
            )}
          </div>

          {(limitReached || status.plan === "free") && (
            <Link
              href="/subscription"
              className="inline-flex items-center justify-center rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              {limitReached ? "Upgrade for more downloads" : "Upgrade plan"}
            </Link>
          )}

        </div>
      )}


      {/* Empty State */}

      {downloads.length === 0 ? (

        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-16 text-center">

          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">

            <Download className="h-7 w-7 text-gray-500" />

          </div>

          <h2 className="mt-4 text-lg font-semibold text-gray-800">
            No downloads yet
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Videos you download will appear here.
          </p>

        </div>

      ) : (

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

          {downloads.map((download) => {

            const video = download.videoId;

            const title =
              video?.videotitle || download.videoTitle || "Untitled Video";

            const channel =
              video?.videochannel || video?.videochanel || "Unknown Channel";

            const size = video?.filesize || download.fileSize;

            const normalizedFilePath =
              video?.filepath?.replace(/\\/g, "/") || "";

            const videoSrc = normalizedFilePath
              ? `${BACKEND_URL}/${normalizedFilePath}`
              : "";

            return (

              <div
                key={download._id}
                className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
              >

                {/* Video Preview */}

                {video ? (

                  <Link href={`/watch/${video._id}?downloaded=true`}>

                    <div className="relative aspect-video overflow-hidden bg-gray-100">

                      {videoSrc ? (

                        <video
                          src={`${videoSrc}#t=0.1`}
                          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                          preload="metadata"
                          muted
                          playsInline
                        />

                      ) : (

                        <div className="flex h-full w-full items-center justify-center">

                          <FileVideo className="h-10 w-10 text-gray-400" />

                        </div>

                      )}


                      {/* Play Overlay */}

                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all duration-200 group-hover:bg-black/20">

                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 opacity-0 shadow-md transition-opacity duration-200 group-hover:opacity-100">

                          <Play className="ml-0.5 h-5 w-5 fill-black text-black" />

                        </div>

                      </div>

                    </div>

                  </Link>

                ) : (

                  <div className="flex aspect-video flex-col items-center justify-center gap-2 bg-gray-100">

                    <FileVideo className="h-10 w-10 text-gray-400" />

                    <span className="text-xs text-gray-500">
                      This video is no longer available
                    </span>

                  </div>

                )}


                {/* Video Details */}

                <div className="p-3">

                  {video ? (

                    <Link href={`/watch/${video._id}?downloaded=true`}>

                      <h2 className="line-clamp-2 text-sm font-semibold leading-tight text-gray-900 transition-colors group-hover:text-red-600">

                        {title}

                      </h2>

                    </Link>

                  ) : (

                    <h2 className="line-clamp-2 text-sm font-semibold leading-tight text-gray-900">

                      {title}

                    </h2>

                  )}


                  <p className="mt-2 text-xs font-medium text-gray-600">

                    {channel}

                  </p>


                  <div className="mt-2 flex items-center justify-between gap-2">

                    <span className="text-xs text-gray-500">

                      {formatFileSize(size)}

                    </span>


                    <span className="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-semibold uppercase text-gray-600">

                      {download.userPlan}

                    </span>

                  </div>


                  <p
                    className="mt-2 text-xs text-gray-400"
                    title={formatExactDate(download.downloadDate)}
                  >

                    Downloaded{" "}
                    {formatDownloadDate(download.downloadDate)}

                  </p>

                  <p className="mt-0.5 text-[11px] text-gray-400">

                    {formatExactDate(download.downloadDate)}

                  </p>

                </div>

              </div>

            );
          })}

        </div>

      )}

    </div>
  );
}