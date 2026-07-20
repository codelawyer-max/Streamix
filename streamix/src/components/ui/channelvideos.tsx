import React from "react";
// Import your existing VideoCard component exactly as it is structured in your project
import VideoCard from "./videocard";

interface Video {
  id: string;
  title: string;
  thumbnail: string;
  views: string;
  duration: string;
  uploadedOn: string;
  channel?: string;
}

interface ChannelVideosProps {
  videos: Video[];
}

export default function ChannelVideos({ videos }: ChannelVideosProps) {
  // Fallback view if the channel has no videos uploaded yet
  if (!videos || videos.length === 0) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-16 px-4 border border-dashed border-gray-200 rounded-2xl bg-gray-50/30">
        <p className="text-sm font-medium text-gray-500">
          No videos uploaded yet.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-4">
      <h3 className="text-base font-bold text-gray-900 px-1">
        Recent Uploads
      </h3>
      
      {/* Responsive grid mirroring the main YouTube home layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-8">
        {videos.map((video) => {
          const cardVideo: VideoProps = {
            id: video.id,
            title: video.title,
            channel: video.channel ?? "Unknown",
            views: video.views,
            timestamp: video.uploadedOn,
            duration: video.duration,
            thumbnail: video.thumbnail,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
              video.channel ?? "User"
            )}`,
          };

          return <VideoCard key={video.id} video={cardVideo} />;
        })}
      </div>
    </div>
  );
}