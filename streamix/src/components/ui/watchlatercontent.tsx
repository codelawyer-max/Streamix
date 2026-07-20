"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Clock } from "lucide-react";
import axiosInstance from "@/lib/AxiosInstance";
import { useUser } from "@/lib/AuthContext";

const WatchLaterContent = () => {
  const { user } = useUser();

  const [watchLaterVideos, setWatchLaterVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadWatchLater();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadWatchLater = async () => {
    try {
      const res = await axiosInstance.get(`/watch/${user?._id}`);
      setWatchLaterVideos(res.data);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id: string) => {
    setWatchLaterVideos((prev) =>
      prev.filter((item) => item._id !== id)
    );
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <Clock className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold">
          Login Required
        </h2>
        <p className="text-gray-500">
          Sign in to view Watch Later.
        </p>
      </div>
    );
  }

  if (watchLaterVideos.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold">
          No videos saved
        </h2>
        <p className="text-gray-500">
          Videos you save will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        {watchLaterVideos.length} videos
      </p>

      {watchLaterVideos.map((item) => (
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

export default WatchLaterContent;
