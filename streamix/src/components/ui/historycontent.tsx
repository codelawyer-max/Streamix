"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Clock, MoreVertical, X } from "lucide-react";

import axiosInstance from "@/lib/AxiosInstance";
import { useUser } from "@/lib/AuthContext";

import { Button } from "@/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

const HistoryContent = () => {
  const { user } = useUser();

  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadHistory();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadHistory = async () => {
    try {
      const currentUserId = user?.id || user?._id;

      const res = await axiosInstance.get(
        `/history/${currentUserId}`
      );

      setHistory(res.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = (historyId: string) => {
    setHistory((prev) =>
      prev.filter((item) => item._id !== historyId)
    );
  };

  return (
    <div className="space-y-6">

      {loading && (
        <div className="text-center py-10">
          Loading history...
        </div>
      )}

      {!loading && !user && (
        <div className="text-center py-16">

          <Clock className="mx-auto h-16 w-16 text-gray-400 mb-4" />

          <h2 className="text-2xl font-semibold">
            Watch history isn't available
          </h2>

          <p className="text-gray-500 mt-2">
            Login to see your watch history.
          </p>

        </div>
      )}

      {!loading && user && history.length === 0 && (
        <div className="text-center py-16">

          <Clock className="mx-auto h-16 w-16 text-gray-400 mb-4" />

          <h2 className="text-2xl font-semibold">
            No watch history yet
          </h2>

          <p className="text-gray-500 mt-2">
            Videos you watch will appear here.
          </p>

        </div>
      )}

      {!loading &&
        user &&
        history.map((item) => {
          // If the populated video item is null, skip rendering to prevent crashing
          if (!item.videoid) return null;

          return (
            <div
              key={item._id}
              className="flex flex-col md:flex-row gap-4 rounded-xl border p-4 hover:bg-gray-50 transition"
            >

              <Link
                href={`/watch/${item.videoid?._id}`}
                className="md:w-72"
              >

                <video
                  src={`${process.env.NEXT_PUBLIC_BACKEND_URL}/${item.videoid?.filepath}`}
                  className="rounded-lg aspect-video w-full object-cover"
                />

              </Link>

              <div className="flex-1">

                <Link href={`/watch/${item.videoid?._id}`}>

                  <h2 className="font-semibold text-lg hover:text-blue-600 line-clamp-2">

                    {item.videoid?.videotitle}

                  </h2>

                </Link>

                <p className="text-sm text-gray-500 mt-2">

                  {item.videoid?.videochannel ||
                    item.videoid?.videochanel}

                </p>

                <p className="text-sm text-gray-500">

                  {item.videoid?.views?.toLocaleString()} views •{" "}

                  {item.videoid?.createdAt ? formatDistanceToNow(
                    new Date(item.videoid.createdAt),
                    { addSuffix: true }
                  ) : ""}

                </p>

                <p className="text-xs text-gray-400 mt-2">

                  Watched{" "}

                  {formatDistanceToNow(
                    new Date(item.createdAt),
                    { addSuffix: true }
                  )}

                </p>

              </div>

            </div>
          );
        })}

    </div>
  );
} 

export default HistoryContent;
