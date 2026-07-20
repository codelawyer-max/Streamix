"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Heart } from "lucide-react";
import axiosInstance from "@/lib/AxiosInstance";
import { useUser } from "@/lib/AuthContext";

const LikedContent = () => {
  const { user } = useUser();

  const [likedVideos, setLikedVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadLikedVideos();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadLikedVideos = async () => {
    try {
      console.log("Current User:", user);
      console.log("User ID:", user?._id);
      const res = await axiosInstance.get(`/like/${user?._id}`);
      console.log(res.data);

      console.log("Liked API Response:", res.data);

      setLikedVideos(res.data);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id: string) => {
    setLikedVideos((prev) => prev.filter((item) => item._id !== id));
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <Heart className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold">Login Required</h2>
        <p className="text-gray-500">
          Sign in to see your liked videos.
        </p>
      </div>
    );
  }

  if (likedVideos.length === 0) {
    return (
      <div className="text-center py-12">
        <Heart className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold">No liked videos</h2>
        <p className="text-gray-500">
          Videos you like will appear here.
        </p>
      </div>
    );
  }
  console.log("Current User:", user);
  console.log(process.env.NEXT_PUBLIC_BACKEND_URL);

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        {likedVideos.length} videos
      </p>

      {likedVideos.map((item) => (
        <Link
          key={item._id}
          href={`/watch/${item.videoid._id}`}
          className="flex gap-4 group"
        >
          <video
            src={`${process.env.NEXT_PUBLIC_BACKEND_URL}/${item.videoid.filepath}`}
            className="w-52 rounded-lg"
          />

          <div>
            <h2 className="font-semibold">
              {item.videoid.videotitle}
            </h2>

            <p className="text-gray-500">
              {item.videoid.videochanel}
            </p>

            <p className="text-gray-500 text-sm">
              {item.videoid.views} views •{" "}
              {formatDistanceToNow(
                new Date(item.videoid.createdAt)
              )}{" "}
              ago
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default LikedContent;