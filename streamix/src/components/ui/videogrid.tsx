import React, { useEffect, useState } from "react";
import axiosInstance from "@/lib/AxiosInstance"; // Fix: Use lowercase file import to match your project structure
import VideoCard from "./videocard";

interface Video {
  _id: string;
  videotitle: string;
  filepath: string;
  videochannel: string;
  views: number;
  createdAt: string;
}

export default function VideoGrid() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        // Double check this matches your exact backend router route
        const response = await axiosInstance.get("/video/getall");
        
        // If your backend returns { result: [...] }, use response.data.result.
        // If it returns the array directly, use response.data.
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
      <div className="flex justify-center py-10 text-gray-400 animate-pulse">
        Loading videos...
      </div>
    );
  }

  if (!videos || videos.length === 0) {
    return (
      <div className="flex justify-center py-10 text-gray-500">
        No videos uploaded yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8 pt-4">
      {videos.map((video) => (
        <VideoCard
          key={video._id}
          video={video}
        />
      ))}
    </div>
  );
}