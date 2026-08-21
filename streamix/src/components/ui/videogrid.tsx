
import React, { useEffect, useState } from "react";
import axiosInstance from "@/lib/AxiosInstance";
import VideoCard from "./videocard";

interface Video {
  _id: string;
  videotitle: string;
  filepath: string;
  videochannel: string;
  views: number;
  createdAt: string;
}

function VideoSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-video w-full rounded-xl bg-gray-200" />

      <div className="mt-3 flex gap-3">
        <div className="h-9 w-9 flex-shrink-0 rounded-full bg-gray-200" />

        <div className="flex-1 space-y-2">
          <div className="h-4 w-4/5 rounded bg-gray-200" />
          <div className="h-3 w-2/5 rounded bg-gray-200" />
          <div className="h-3 w-3/5 rounded bg-gray-200" />
        </div>
      </div>
    </div>
  );
}

export default function VideoGrid() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const response = await axiosInstance.get("/video/getall");

        const videoData = Array.isArray(response.data)
          ? response.data
          : response.data.result || [];

        setVideos(videoData);
      } catch (error) {
        console.error("Error fetching videos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-x-5 gap-y-8 pt-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <VideoSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (!videos || videos.length === 0) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-2xl">
          🎬
        </div>

        <h2 className="text-lg font-semibold text-gray-900">
          No videos yet
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Upload a video to see it appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-x-5 gap-y-9 pt-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {videos.map((video) => (
        <VideoCard key={video._id} video={video} />
      ))}
    </div>
  );
}

