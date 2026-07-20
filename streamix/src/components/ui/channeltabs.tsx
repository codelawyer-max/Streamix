import React, { useState } from "react";

export default function ChannelTabs() {
  const [activeTab, setActiveTab] = useState("Videos");

  const tabs = ["Home", "Videos", "Shorts", "Playlists", "Community", "About"];

  return (
    <div className="w-full border-b border-gray-200 mt-4">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
        {tabs.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative pb-3 px-4 text-sm font-medium transition-all duration-200 whitespace-nowrap outline-none ${
                isActive 
                  ? "text-gray-900 font-semibold" 
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {tab}
              {/* Active Indicator Underline */}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gray-900 rounded-t-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}