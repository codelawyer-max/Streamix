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
  videochanel?: string; // Spelling fallback matching backend schema
  views: number;
  createdAt: string;
  description?: string;
  requiredPlan?: "free" | "bronze" | "silver" | "gold";
}

const WatchPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useUser();

  const [currentVideo, setCurrentVideo] = useState<VideoData | null>(null);
  const [allVideos, setAllVideos] = useState<VideoData[]>([]);
  const [loading, setLoading] = useState(true);
  const currentVideoIndex = allVideos.findIndex(
    (video) => video._id === currentVideo?._id
  );
  const planRank = {
    free: 0,
    bronze: 1,
    silver: 2,
    gold: 3,
  };
  const [videoAccess, setVideoAccess] = useState(true);

  const hasAccess = () => {
    if (!currentVideo) return false;

    const userPlan = user?.plan || "free";
    const requiredPlan = currentVideo.requiredPlan || "free";

    return (
      planRank[userPlan as keyof typeof planRank] >=
      planRank[requiredPlan as keyof typeof planRank]
    );
  };

  const nextVideo =
    currentVideoIndex >= 0 &&
      currentVideoIndex < allVideos.length - 1
      ? allVideos[currentVideoIndex + 1]
      : null;

  useEffect(() => {
    const fetchVideoData = async () => {

      if (!id || typeof id !== "string") return;


      try {

        // Get current user id
        const userId = user?._id;

        if (!userId) {
          console.log("User not loaded yet");
          return;
        }


        // Secure video request
        const videoResponse =
          await axiosInstance.get(
            `/video/${id}?userId=${userId}`
          );

        setVideoAccess(
          videoResponse.data.hasAccess
        );


        if (!videoResponse.data.hasAccess) {

          setCurrentVideo({
            ...videoResponse.data.result,
          });

          return;

        }


        setCurrentVideo(
          videoResponse.data.result
        );



        // Fetch related videos
        const videosResponse =
          await axiosInstance.get(
            "/video/getall"
          );


        const videosList: VideoData[] =
          Array.isArray(videosResponse.data)
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
  },  [id, user?._id]);

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
  console.log("USER PLAN:", user?.plan);
  console.log("VIDEO PLAN:", currentVideo?.requiredPlan);

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Video & Content Area */}
          <section className="flex flex-col gap-6 lg:col-span-2">

            {
              hasAccess()

                ?

                <>

                  <VideoPlayer
                    video={currentVideo}
                    nextVideo={nextVideo}
                  />

                  <VideoInfo video={currentVideo} />

                  <Comments video={currentVideo} />

                </>

                :

                <div className="flex aspect-video flex-col items-center justify-center rounded-xl bg-gray-900 p-8 text-center text-white">

                  <h2 className="mb-3 text-2xl font-bold">
                    🔒 Premium Video
                  </h2>

                  <p className="mb-6 text-gray-300">

                    This video requires the{" "}

                    <span className="font-semibold capitalize">

                      {currentVideo.requiredPlan}

                    </span>

                    {" "}plan or higher.

                  </p>

                  <button
                    onClick={() => router.push("/subscription")}
                    className="rounded-lg bg-blue-600 px-6 py-3 font-semibold transition hover:bg-blue-700"
                  >
                    Upgrade Now
                  </button>

                </div>

            }

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
