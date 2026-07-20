import React, { useState } from "react";

interface Channel {
  id: string | string[] | undefined;
  name: string;
  username: string;
  email: string;
  image: string;
  description: string;
}

interface ChannelHeaderProps {
  channel: Channel;
}

export default function ChannelHeader({ channel }: ChannelHeaderProps) {
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubscribe = () => {
    setIsSubscribed((prev) => !prev);
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Channel Banner */}
      <div className="w-full h-40 sm:h-48 md:h-56 bg-gradient-to-r from-red-500 via-purple-600 to-blue-600 rounded-2xl shadow-inner" />

      {/* Channel Info Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 px-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Circular Avatar */}
          <img
            src={channel?.image || "https://github.com/shadcn.png"}
            alt={channel?.name || "Channel Avatar"}
            className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white shadow-md object-cover bg-gray-100"
          />

          {/* Metadata */}
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              {channel?.name || "Loading Channel..."}
            </h1>
            <div className="flex flex-wrap items-center gap-x-2 text-sm text-gray-500">
              <span className="font-semibold text-gray-800">
                {channel?.username || `@${channel?.name?.toLowerCase().replace(/\s+/g, "") || "channel"}`}
              </span>
              <span className="text-gray-300">•</span>
              <span>0 subscribers</span>
              <span className="text-gray-300">•</span>
              <span>0 videos</span>
            </div>
            <p className="text-sm text-gray-600 max-w-xl mt-2 line-clamp-2">
              {channel?.description || "No description available."}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleSubscribe}
          className={`w-full md:w-auto px-6 h-10 font-medium text-sm rounded-full transition-all duration-200 shadow-sm whitespace-nowrap ${
            isSubscribed
              ? "bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-200"
              : "bg-red-600 hover:bg-red-700 text-white"
          }`}
        >
          {isSubscribed ? "Unsubscribe" : "Subscribe"}
        </button>
      </div>
    </div>
  );
}