import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import axiosInstance from "@/lib/AxiosInstance";
import { Comments } from "@/components/ui/comments";
import RelatedVideos from "@/components/ui/relatedvideos";
import VideoInfo from "@/components/ui/videoinfo";
import VideoPlayer from "@/components/ui/videoplayer";

export interface VideoData {
  _id: string;
  videotitle: string;
  filepath: string;
  videochannel?: string;
  videochanel?: string; // Spelling fallback matching backend schema
  views: number;
  createdAt: string;
  description?: string;
}

const WatchPage = () => {
  const router = useRouter();
  const { id } = router.query;

  const [currentVideo, setCurrentVideo] = useState<VideoData | null>(null);
  const [allVideos, setAllVideos] = useState<VideoData[]>([]);
  const [loading, setLoading] = useState(true);
  const currentVideoIndex = allVideos.findIndex(
    (video) => video._id === currentVideo?._id
  );

  const nextVideo =
    currentVideoIndex >= 0 &&
      currentVideoIndex < allVideos.length - 1
      ? allVideos[currentVideoIndex + 1]
      : null;

  useEffect(() => {
    const fetchVideoData = async () => {
      if (!id || typeof id !== "string") return;
      try {
        const res = await axiosInstance.get("/video/getall");

        const videosList: VideoData[] = Array.isArray(res.data)
          ? res.data
          : res.data.result || [];

        const foundVideo = videosList.find((vid) => vid._id === id);

        setCurrentVideo(foundVideo || null);
        setAllVideos(videosList);
      } catch (error) {
        console.error("Error fetching watch page video details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideoData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-500">
        Loading video...
      </div>
    );
  }

  if (!currentVideo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-500">
        Video not found.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Video & Content Area */}
          <section className="flex flex-col gap-6 lg:col-span-2">
            <VideoPlayer
              video={currentVideo}
              nextVideo={nextVideo}
            />
            <VideoInfo video={currentVideo} />
            <Comments video={currentVideo} />
          </section>

          {/* Related Sidebar */}
          <aside className="lg:col-span-1">
            <RelatedVideos videos={allVideos} />
          </aside>
        </div>
      </main>
    </div>
  );
};

export default WatchPage;
