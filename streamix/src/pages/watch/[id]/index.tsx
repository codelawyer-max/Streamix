import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import axiosInstance from "@/lib/AxiosInstance";
import { Comments } from "@/components/ui/comments";
import RelatedVideos from "@/components/ui/relatedvideos";
import VideoInfo from "@/components/ui/videoinfo";
import VideoPlayer from "@/components/ui/videoplayer";
import { useUser } from "@/lib/AuthContext";

export interface VideoData {
  _id: string;
  videotitle: string;
  filepath: string;
  videochannel?: string;
  videochanel?: string;
  views: number;
  createdAt: string;
  description?: string;
  requiredPlan?: "free" | "bronze" | "silver" | "gold";
}

const WatchPage = () => {
  const router = useRouter();
  const { id, downloaded } = router.query;
  const { user } = useUser();

  const [currentVideo, setCurrentVideo] = useState<VideoData | null>(null);
  const [allVideos, setAllVideos] = useState<VideoData[]>([]);
  const [loading, setLoading] = useState(true);

  const [videoAccess, setVideoAccess] = useState(true);

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
        const userId = user?._id;

        if (!userId) {
          console.log("User not loaded yet");
          return;
        }

        const downloadedParam =
          downloaded === "true" ? "&downloaded=true" : "";

        const videoResponse = await axiosInstance.get(
          `/video/${id}?userId=${userId}${downloadedParam}`
        );

        setVideoAccess(videoResponse.data.hasAccess);

        setCurrentVideo(videoResponse.data.result);

        // If user does not have access, stop here.
        if (!videoResponse.data.hasAccess) {
          return;
        }

        // Fetch all videos for related videos / next video.
        const videosResponse = await axiosInstance.get("/video/getall");

        const videosList: VideoData[] = Array.isArray(videosResponse.data)
          ? videosResponse.data
          : videosResponse.data.result || [];

        setAllVideos(videosList);
      } catch (error) {
        console.error(
          "Error fetching watch page video details:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    fetchVideoData();
  }, [id, downloaded, user?._id]);

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
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">

          {/* Main Video & Content Area */}
          <section className="flex min-w-0 flex-col gap-5 lg:col-span-2">

            {videoAccess ? (
              <>
                {/* Video Player */}
                <div className="overflow-hidden rounded-xl bg-black shadow-sm">
                  <VideoPlayer
                    video={currentVideo}
                    nextVideo={nextVideo}
                  />
                </div>

                {/* Video Information */}
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
                  <VideoInfo video={currentVideo} />
                </div>

                {/* Watch Party */}
                <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div>
                    <h2 className="font-semibold text-gray-900">
                      Watch together
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                      Invite others and watch this video together in real time.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      const roomId =
                        Math.random().toString(36).substring(2, 10);

                      router.push(
                        `/watch-party/${roomId}?videoId=${currentVideo._id}`
                      );
                    }}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 active:scale-[0.98] sm:w-auto"
                  >
                    🎉 Start Watch Party
                  </button>
                </div>

                {/* Comments */}
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
                  <Comments video={currentVideo} />
                </div>
              </>
            ) : (
              /* Premium Video Restriction */
              <div className="flex aspect-video flex-col items-center justify-center rounded-2xl border border-gray-800 bg-gray-950 p-8 text-center text-white shadow-xl">

                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/10 text-3xl">
                  🔒
                </div>

                <h2 className="text-2xl font-bold sm:text-3xl">
                  Premium Video
                </h2>

                <p className="mt-3 max-w-md text-sm leading-6 text-gray-400 sm:text-base">
                  This video is available for{" "}
                  <span className="font-semibold capitalize text-white">
                    {currentVideo.requiredPlan}
                  </span>{" "}
                  subscribers and higher.
                </p>

                <button
                  onClick={() => router.push("/subscription")}
                  className="mt-6 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-blue-700 active:scale-[0.98]"
                >
                  View Plans & Upgrade
                </button>
              </div>
            )}

          </section>

          {/* Related Videos Sidebar */}
          <aside className="min-w-0 lg:col-span-1">
            <div className="sticky top-20">
              <RelatedVideos videos={allVideos} />
            </div>
          </aside>

        </div>
      </main>
    </div>
  );
};

export default WatchPage;
