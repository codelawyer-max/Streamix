// Inside src/components/ui/videoplayer.tsx

interface VideoPlayerProps {
  video: {
    _id: string;
    videotitle: string;
    filepath: string;
    // Include other optional fields if needed
  };
}

export default function VideoPlayer({ video }: VideoPlayerProps) {
  // Normalize windows backslashes to forward slashes for the URL
  const normalizedPath = video.filepath?.replace(/\\/g, "/");
  const videoSrc = `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/${normalizedPath}`;
  console.log(videoSrc);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
      <video
        src={videoSrc}
        className="h-full w-full object-contain"
        controls
        autoPlay
        preload="auto"
      />
    </div>
  );
}

