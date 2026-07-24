import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
} from "lucide-react";

interface VideoPlayerProps {
  video: {
    _id: string;
    videotitle: string;
    filepath: string;
  };

  nextVideo?: {
    _id: string;
    videotitle: string;
    filepath: string;
  } | null;
}

export default function VideoPlayer({
  video,
  nextVideo,
}: VideoPlayerProps) {
  // Normalize Windows path
  const normalizedPath = video.filepath?.replace(/\\/g, "/");

  const videoSrc = `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"
    }/${normalizedPath}`;


  // Reference to HTML video element
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<HTMLDivElement | null>(null);
  const lastTapTime = useRef<number>(0);
  const lastTapPosition = useRef<number>(0);
  const router = useRouter();


  // Player states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnded, setIsEnded] = useState(false);


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

  useEffect(() => {
    setIsEnded(false);
    setCurrentTime(0);
    setIsPlaying(false);
    setIsLoading(true);

    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }

  }, [video._id]);



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

  const handleEnded = () => {
    setIsEnded(true);
  };

  const replayVideo = () => {
    const videoElement = videoRef.current;

    if (!videoElement) return;

    videoElement.currentTime = 0;
    videoElement.play();

    setIsEnded(false);
  };

  const playNextVideo = () => {
    if (!nextVideo) return;

    router.push(`/watch/${nextVideo._id}`);
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

  const handlePointerDown = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {

    // Handle only mobile touch events
    if (event.pointerType !== "touch") return;


    const now = Date.now();

    const timeDifference = now - lastTapTime.current;


    const playerElement = event.currentTarget;

    const rect = playerElement.getBoundingClientRect();


    // Find where user tapped
    const tapPosition = event.clientX - rect.left;


    // Double tap detected
    if (timeDifference < 350 && timeDifference > 0) {


      if (tapPosition < rect.width / 2) {

        // Left side
        skipBackward();

      } else {

        // Right side
        skipForward();

      }


      lastTapTime.current = 0;


    } else {


      // First tap
      lastTapTime.current = now;

    }

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
      onPointerDown={handlePointerDown}
      onContextMenu={(e) => e.preventDefault()}
      className="relative aspect-video w-full overflow-hidden rounded-xl bg-black touch-none select-none"
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
        onEnded={handleEnded}
      />


      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white border-t-transparent"></div>
        </div>
      )}


      {/* Video Finished Overlay */}
      {isEnded && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-black/70 text-white">

          <h2 className="text-xl font-semibold">
            Video Finished
          </h2>


          <div className="flex gap-4">

            {/* Play Again */}
            <button
              onClick={replayVideo}
              className="rounded-full bg-white px-5 py-2 text-black transition hover:bg-gray-200"
            >
              ▶ Play Again
            </button>


            {/* Next Video */}
            {nextVideo && (
              <button
                onClick={playNextVideo}
                className="rounded-full bg-white px-5 py-2 text-black transition hover:bg-gray-200"
              >
                ⏭ Next Video
              </button>
            )}

          </div>

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
          className="
mb-3 
h-1.5 
w-full 
cursor-pointer 
accent-white
"
        />


        {/* Bottom Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">


          {/* Left Controls */}
        <div className="flex items-center gap-2 sm:gap-3">


            {/* Skip Backward */}
            <button
              onClick={skipBackward}
              className="rounded-full bg-white/90 p-2 text-black transition hover:bg-white"
              title="Rewind 10 seconds"
            >
              <RotateCcw size={20} />
            </button>


            {/* Play / Pause */}
            <button
              onClick={togglePlay}
              className="rounded-full bg-white/90 p-2 text-black transition hover:bg-white"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>


            {/* Mute / Unmute */}
            <button
              onClick={toggleMute}
              className="rounded-full bg-white/90 p-2 text-black transition hover:bg-white"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>

            {/* Volume Slider */}
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={handleVolumeChange}
             className="hidden w-32 cursor-pointer sm:block"
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
              className="rounded-full bg-white/90 p-2 text-black transition hover:bg-white"
              title="Forward 10 seconds"
            >
              <RotateCw size={20} />
            </button>



            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="rounded-full bg-white/90 p-2 text-black transition hover:bg-white"
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>


          </div>


        </div>


      </div>


    </div>
  );
}