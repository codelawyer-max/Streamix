// Inside src/components/ui/relatedvideos.tsx
import React from "react";
import VideoCard from "./videocard"; // Adjust path to where your VideoCard is located

interface RelatedVideosProps {
  videos: any[]; // Or use your VideoData[] interface here
}

export default function RelatedVideos({ videos }: RelatedVideosProps) {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-bold text-gray-900">Up Next</h3>
      <div className="flex flex-col gap-4">
        {videos && videos.map((video) => (
          <VideoCard key={video._id} video={video} />
        ))}
      </div>
    </div>
  );
}
