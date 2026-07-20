"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
// Replace with this:
import { Avatar, AvatarFallback } from "@/components/ui/avatar"; // Adjusted import path to match standard project layout

interface VideoProps {
  _id: string;
  videotitle: string;
  filepath: string;
  videochannel?: string; // Handles spelling safety
  videochanel?: string;  // Handles trainer's spelling safety
  views: number;
  createdAt: string;
}

export default function VideoCard({
  video,
}: {
  video: VideoProps;
}) {
  // Ultra-safe function to handle undefined, malformed, or missing dates
  const renderTimeAgo = () => {
    if (!video || !video.createdAt) {
      return "recently";
    }

    try {
      const parsedDate = new Date(video.createdAt);
      if (isNaN(parsedDate.getTime())) {
        return "recently";
      }
      return formatDistanceToNow(parsedDate, { addSuffix: true });
    } catch (error) {
      return "recently";
    }
  };

  // Determine channel name regardless of spelling variants
  const channelName = video.videochannel || video.videochanel || "Unknown Channel";

  // Safeguards filepath separator issues across environments
  const normalizedFilePath = video.filepath?.replace(/\\/g, "/");

  return (
    <Link
      href={`/watch/${video._id}`}
      className="flex flex-col gap-3 group cursor-pointer"
    >
      {/* Video Preview */}
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
        <video
          src={`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/${normalizedFilePath}#t=0.1`}
          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
          preload="metadata"
          muted
          playsInline
        />
        <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-medium px-1.5 py-0.5 rounded">
          Video
        </span>
      </div>

      {/* Details */}
      <div className="flex gap-3 px-1">
        <Avatar className="h-9 w-9 border border-gray-100 flex-shrink-0">
          <AvatarFallback className="bg-gray-200 text-xs font-bold text-gray-700">
            {channelName[0]?.toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>

        <div className="flex flex-col min-w-0">
          <h3 className="text-sm font-semibold leading-tight text-gray-900 line-clamp-2 group-hover:text-red-600 transition-colors">
            {video.videotitle || "Untitled Video"}
          </h3>

          <p className="text-xs text-gray-600 mt-1.5 font-medium">
            {channelName}
          </p>

          <p className="text-xs text-gray-500 mt-0.5">
            {(video.views ?? 0).toLocaleString()} views • {renderTimeAgo()}
          </p>
        </div>
      </div>
    </Link>
  );
}