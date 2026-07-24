import { useEffect, useRef, useState } from "react";

interface VideoPlayerProps {
  video: {
    _id: string;
    videotitle: string;
    filepath: string;
  };
}

export default function VideoPlayer({ video }: VideoPlayerProps) {
  // Normalize Windows path
  const normalizedPath = video.filepath?.replace(/\\/g, "/");

  const videoSrc = `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"
    }/${normalizedPath}`;


  // Reference to HTML video element
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<HTMLDivElement | null>(null);


  // Player states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Sync fullscreen state with browser changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener(
      "fullscreenchange",
      handleFullscreenChange
    );

    return () => {
      document.removeEventListener(
        "fullscreenchange",
        handleFullscreenChange
      );
    };
  }, []);



  // Play / Pause button handler
  const togglePlay = () => {
    const videoElement = videoRef.current;

    if (!videoElement) return;

    if (videoElement.paused) {
      videoElement.play();
    } else {
      videoElement.pause();
    }
  };



  // Sync React state when video starts
  const handlePlay = () => {
    setIsPlaying(true);
  };


  // Sync React state when video pauses
  const handlePause = () => {
    setIsPlaying(false);
  };



  // Get video duration after metadata loads
  const handleLoadedMetadata = () => {
    const videoElement = videoRef.current;

    if (!videoElement) return;

    setDuration(videoElement.duration);
    setIsLoading(false);
  };



  // Update current playback time
  const handleTimeUpdate = () => {
    const videoElement = videoRef.current;

    if (!videoElement) return;

    setCurrentTime(videoElement.currentTime);
  };

  // Show loader when video buffers
  const handleWaiting = () => {
    setIsLoading(true);
  };


  // Hide loader when video resumes
  const handlePlaying = () => {
    setIsLoading(false);
  };



  // Convert seconds into mm:ss
  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";

    const minutes = Math.floor(time / 60);

    const seconds = Math.floor(time % 60);

    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Calculate watched percentage of the video
  const progressPercentage =
    duration > 0 ? (currentTime / duration) * 100 : 0;

  // Move video to selected position
  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const videoElement = videoRef.current;

    if (!videoElement) return;

    // Slider value comes as a string, so convert it to a number
    const newTime = Number(event.target.value);

    // Update actual video position
    videoElement.currentTime = newTime;

    // Update React state
    setCurrentTime(newTime);
  };

  // Handle volume slider change
  const handleVolumeChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const videoElement = videoRef.current;

    if (!videoElement) return;

    // Slider value (0 to 1)
    const newVolume = Number(event.target.value);

    // Update actual video volume
    videoElement.volume = newVolume;

    // Update React state
    setVolume(newVolume);

    // Update mute state
    if (newVolume === 0) {
      videoElement.muted = true;
      setIsMuted(true);
    } else {
      videoElement.muted = false;
      setIsMuted(false);
    }
  };

  // Mute / Unmute video
  const toggleMute = () => {
    const videoElement = videoRef.current;

    if (!videoElement) return;

    if (videoElement.muted) {
      videoElement.muted = false;
      setIsMuted(false);

      // Restore previous volume or default to full volume
      if (videoElement.volume === 0) {
        videoElement.volume = 1;
        setVolume(1);
      }
    } else {
      videoElement.muted = true;
      setIsMuted(true);
    }
  };

  // Skip video backward by 10 seconds
  const skipBackward = () => {
    const videoElement = videoRef.current;

    if (!videoElement) return;

    const newTime = Math.max(videoElement.currentTime - 10, 0);

    videoElement.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Skip video forward by 10 seconds
  const skipForward = () => {
    const videoElement = videoRef.current;

    if (!videoElement) return;

    const newTime = Math.min(
      videoElement.currentTime + 10,
      duration
    );

    videoElement.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Enter or Exit Fullscreen
  const toggleFullscreen = async () => {
    const playerElement = playerRef.current;

    if (!playerElement) return;

    try {
      if (!document.fullscreenElement) {
        await playerElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error("Fullscreen error:", error);
    }
  };



  return (
    <div
      ref={playerRef}
      className="relative aspect-video w-full overflow-hidden rounded-xl bg-black"
    >

      {/* Video */}
      <video
        ref={videoRef}
        src={videoSrc}
        className="h-full w-full object-contain"
        preload="auto"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onPlay={handlePlay}
        onPause={handlePause}
        onWaiting={handleWaiting}
        onPlaying={handlePlaying}
      />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white border-t-transparent"></div>
        </div>
      )}


      {/* Custom Controls */}
      <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/80 via-black/40 to-transparent px-4 py-3 text-white">

        {/* Progress Bar */}
        <input
          type="range"
          min={0}
          max={duration}
          value={currentTime}
          onChange={handleSeek}
          className="mb-3 w-full cursor-pointer"
        />

        {/* Bottom Controls */}
        <div className="flex items-center justify-between">

          {/* Left Controls */}
          <div className="flex items-center gap-3">

            {/* Skip Backward */}
            <button
              onClick={skipBackward}
              className="rounded-full bg-white/90 px-3 py-2 text-black transition hover:bg-white"
            >
              ⏪ 10s
            </button>

            {/* Play / Pause */}
            <button
              onClick={togglePlay}
              className="rounded-full bg-white/90 px-4 py-2 text-black transition hover:bg-white"
            >
              {isPlaying ? "Pause" : "Play"}
            </button>

            {/* Mute / Unmute */}
            <button
              onClick={toggleMute}
              className="rounded-full bg-white/90 px-3 py-2 text-black transition hover:bg-white"
            >
              {isMuted ? "Mute" : "Volume"}
            </button>

            {/* Volume Slider */}
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={handleVolumeChange}
              className="w-32 cursor-pointer"
            />

          </div>
          {/* Right Controls */}
          <div className="flex items-center gap-3">

            {/* Time Display */}
            <div className="text-sm font-medium">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>

            {/* Skip Forward */}
            <button
              onClick={skipForward}
              className="rounded-full bg-white/90 px-3 py-2 text-black transition hover:bg-white"
            >
              10s ⏩
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="rounded-full bg-white/90 px-3 py-2 text-black transition hover:bg-white"
            >
              {isFullscreen ? "Exit" : "Fullscreen"}
            </button>

          </div>



        </div>

      </div>

    </div>
  );
}
