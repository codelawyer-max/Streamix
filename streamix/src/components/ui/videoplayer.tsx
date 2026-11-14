import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
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
  SkipForward,
  Lock,
  RefreshCw,
} from "lucide-react";

interface PlayerVideo {
  _id: string;
  videotitle: string;
  filepath: string;
}

interface VideoPlayerProps {
  video: PlayerVideo;
  nextVideo?: PlayerVideo | null;
  // Minutes of each video the user's plan allows. null / undefined = unlimited.
  watchLimitMinutes?: number | null;
  planName?: string;
}

type Side = "left" | "right";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

const SKIP_SECONDS = 10;
const DOUBLE_TAP_MS = 300;
const CONTROLS_HIDE_MS = 3000;

const pad = (value: number) => value.toString().padStart(2, "0");

// 75 -> "1:15", 3725 -> "1:02:05"
const formatTime = (time: number) => {
  if (!Number.isFinite(time) || time < 0) return "0:00";

  const hours = Math.floor(time / 3600);
  const minutes = Math.floor((time % 3600) / 60);
  const seconds = Math.floor(time % 60);

  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`;
};

export default function VideoPlayer({
  video,
  nextVideo,
  watchLimitMinutes,
  planName,
}: VideoPlayerProps) {
  const router = useRouter();

  const videoSrc = `${BACKEND_URL}/${(video.filepath || "").replace(/\\/g, "/")}`;

  const limitSeconds =
    watchLimitMinutes && watchLimitMinutes > 0 ? watchLimitMinutes * 60 : null;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<HTMLDivElement | null>(null);

  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const singleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lastTap = useRef<{ time: number; side: Side | null }>({
    time: 0,
    side: null,
  });
  const lastPointerType = useRef<string>("mouse");

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnded, setIsEnded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [skipFeedback, setSkipFeedback] = useState<{
    side: Side;
    text: string;
  } | null>(null);

  const controlsVisible = showControls || !isPlaying;
  const limitApplies =
    limitSeconds !== null && (duration === 0 || duration > limitSeconds);

  // ------------------------------------------------------------------
  // Housekeeping
  // ------------------------------------------------------------------

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // A different video was opened: reset everything
  useEffect(() => {
    setIsEnded(false);
    setHasError(false);
    setLimitReached(false);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setIsLoading(true);
    setSkipFeedback(null);
  }, [video._id]);

  useEffect(() => {
    return () => {
      if (controlsTimer.current) clearTimeout(controlsTimer.current);
      if (singleTapTimer.current) clearTimeout(singleTapTimer.current);
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    };
  }, []);

  const revealControls = useCallback(() => {
    setShowControls(true);

    if (controlsTimer.current) clearTimeout(controlsTimer.current);

    controlsTimer.current = setTimeout(() => {
      // Controls stay visible while the video is paused
      if (videoRef.current && !videoRef.current.paused) {
        setShowControls(false);
      }
    }, CONTROLS_HIDE_MS);
  }, []);

  // ------------------------------------------------------------------
  // Plan watch-time limit
  // ------------------------------------------------------------------

  const stopAtLimit = (element: HTMLVideoElement) => {
    if (limitSeconds === null) return false;
    if (element.currentTime < limitSeconds) return false;

    element.pause();
    element.currentTime = limitSeconds;
    setCurrentTime(limitSeconds);
    setLimitReached(true);

    return true;
  };

  // ------------------------------------------------------------------
  // Playback controls
  // ------------------------------------------------------------------

  const togglePlay = () => {
    const element = videoRef.current;

    if (!element || hasError || limitReached) return;

    if (element.paused) {
      if (isEnded) {
        element.currentTime = 0;
        setIsEnded(false);
      }

      element.play().catch(() => {
        // Autoplay or load problems are reported by the error handler
      });
    } else {
      element.pause();
    }
  };

  const seekTo = (target: number) => {
    const element = videoRef.current;

    if (!element) return;

    const maxTime = Number.isFinite(element.duration)
      ? element.duration
      : target;

    const next = Math.max(0, Math.min(target, maxTime));

    // Cannot jump past what the plan allows
    if (limitSeconds !== null && next >= limitSeconds) {
      element.pause();
      element.currentTime = limitSeconds;
      setCurrentTime(limitSeconds);
      setLimitReached(true);
      return;
    }

    element.currentTime = next;
    setCurrentTime(next);
    setIsEnded(false);
    setLimitReached(false);
  };

  const showSkipFeedback = (side: Side) => {
    setSkipFeedback({
      side,
      text: side === "right" ? `+${SKIP_SECONDS}s` : `-${SKIP_SECONDS}s`,
    });

    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);

    feedbackTimer.current = setTimeout(() => setSkipFeedback(null), 700);
  };

  const skip = (seconds: number, side: Side) => {
    const element = videoRef.current;

    if (!element) return;

    seekTo(element.currentTime + seconds);
    showSkipFeedback(side);
  };

  const handleSeekInput = (event: ChangeEvent<HTMLInputElement>) => {
    seekTo(Number(event.target.value));
  };

  const changeVolume = (newVolume: number) => {
    const element = videoRef.current;

    if (!element) return;

    const safeVolume = Math.max(0, Math.min(1, newVolume));

    element.volume = safeVolume;
    element.muted = safeVolume === 0;

    setVolume(safeVolume);
    setIsMuted(safeVolume === 0);
  };

  const toggleMute = () => {
    const element = videoRef.current;

    if (!element) return;

    if (element.muted) {
      element.muted = false;
      setIsMuted(false);

      if (element.volume === 0) {
        element.volume = 1;
        setVolume(1);
      }
    } else {
      element.muted = true;
      setIsMuted(true);
    }
  };

  const toggleFullscreen = async () => {
    const container = playerRef.current;
    const element = videoRef.current as any;

    if (!container) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (container.requestFullscreen) {
        await container.requestFullscreen();
      } else if (element?.webkitEnterFullscreen) {
        // iPhone Safari only supports fullscreen on the video element itself
        element.webkitEnterFullscreen();
      }
    } catch (error) {
      console.error("Fullscreen error:", error);
    }
  };

  const playNextVideo = () => {
    if (!nextVideo) return;

    router.push(`/watch/${nextVideo._id}`);
  };

  const replayFromStart = () => {
    const element = videoRef.current;

    if (!element) return;

    element.currentTime = 0;
    setCurrentTime(0);
    setIsEnded(false);
    setLimitReached(false);

    element.play().catch(() => {});
  };

  const retryLoading = () => {
    const element = videoRef.current;

    if (!element) return;

    setHasError(false);
    setIsLoading(true);
    element.load();
  };

  // ------------------------------------------------------------------
  // <video> events
  // ------------------------------------------------------------------

  const handleLoadedMetadata = () => {
    const element = videoRef.current;

    if (element) setDuration(element.duration);
  };

  const handleTimeUpdate = () => {
    const element = videoRef.current;

    if (!element) return;

    setCurrentTime(element.currentTime);
    stopAtLimit(element);
  };

  // Any of these means the video has data to show
  const handleReady = () => setIsLoading(false);

  const handleWaiting = () => setIsLoading(true);

  const handleSeeking = () => {
    const element = videoRef.current;

    if (element && element.readyState < 3) setIsLoading(true);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    setIsPlaying(false);
  };

  // ------------------------------------------------------------------
  // Touch and mouse gestures (on the surface above the video)
  // ------------------------------------------------------------------

  const handleSurfacePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    lastPointerType.current = event.pointerType;
  };

  const handleSurfacePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    lastPointerType.current = event.pointerType;

    // Mouse clicks are handled in handleSurfaceClick
    if (event.pointerType !== "touch") return;

    revealControls();

    const rect = event.currentTarget.getBoundingClientRect();
    const side: Side =
      event.clientX - rect.left < rect.width / 2 ? "left" : "right";

    const now = Date.now();
    const previous = lastTap.current;

    // Second (or third...) tap on the same side: skip 10 seconds
    if (now - previous.time < DOUBLE_TAP_MS && previous.side === side) {
      if (singleTapTimer.current) {
        clearTimeout(singleTapTimer.current);
        singleTapTimer.current = null;
      }

      skip(side === "right" ? SKIP_SECONDS : -SKIP_SECONDS, side);
      lastTap.current = { time: now, side };
      return;
    }

    // First tap: wait a moment to see whether a second tap follows
    lastTap.current = { time: now, side };

    if (singleTapTimer.current) clearTimeout(singleTapTimer.current);

    singleTapTimer.current = setTimeout(() => {
      singleTapTimer.current = null;
      togglePlay();
    }, DOUBLE_TAP_MS);
  };

  const handleSurfaceClick = () => {
    // On touch screens the pointer handler above already did the work
    if (lastPointerType.current === "touch") return;

    togglePlay();
    revealControls();
  };

  const handleSurfaceDoubleClick = () => {
    if (lastPointerType.current === "touch") return;

    toggleFullscreen();
  };

  // ------------------------------------------------------------------
  // Keyboard shortcuts (when the player has focus)
  // ------------------------------------------------------------------

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    // Ignore keys that were meant for the buttons and sliders inside
    if (event.target !== event.currentTarget) return;

    const element = videoRef.current;

    if (!element) return;

    switch (event.key) {
      case " ":
      case "k":
      case "K":
        event.preventDefault();
        togglePlay();
        break;

      case "ArrowLeft":
      case "j":
      case "J":
        event.preventDefault();
        skip(-SKIP_SECONDS, "left");
        break;

      case "ArrowRight":
      case "l":
      case "L":
        event.preventDefault();
        skip(SKIP_SECONDS, "right");
        break;

      case "ArrowUp":
        event.preventDefault();
        changeVolume(element.volume + 0.1);
        break;

      case "ArrowDown":
        event.preventDefault();
        changeVolume(element.volume - 0.1);
        break;

      case "m":
      case "M":
        toggleMute();
        break;

      case "f":
      case "F":
        toggleFullscreen();
        break;

      default:
        return;
    }

    revealControls();
  };

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  const buttonClass =
    "rounded-full bg-white/80 p-1.5 text-black transition-all duration-200 hover:scale-110 hover:bg-white sm:p-2";

  const limitMarkerPercent =
    limitApplies && limitSeconds !== null && duration > 0
      ? Math.min(100, (limitSeconds / duration) * 100)
      : null;

  return (
    <div
      ref={playerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseMove={revealControls}
      onContextMenu={(event) => event.preventDefault()}
      className="relative aspect-video w-full select-none overflow-hidden rounded-xl bg-black shadow-lg outline-none touch-manipulation"
    >
      {/* Video */}
      <video
        ref={videoRef}
        src={videoSrc}
        className="h-full w-full object-contain"
        preload="auto"
        playsInline
        onLoadedMetadata={handleLoadedMetadata}
        onLoadedData={handleReady}
        onCanPlay={handleReady}
        onPlaying={() => {
          handleReady();
          setIsPlaying(true);
        }}
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onWaiting={handleWaiting}
        onSeeking={handleSeeking}
        onSeeked={handleReady}
        onEnded={() => {
          setIsEnded(true);
          setIsPlaying(false);
        }}
        onError={handleError}
      />

      {/* Gesture surface: tap, double-tap, click, double-click */}
      <div
        className="absolute inset-0 z-10"
        onPointerDown={handleSurfacePointerDown}
        onPointerUp={handleSurfacePointerUp}
        onClick={handleSurfaceClick}
        onDoubleClick={handleSurfaceDoubleClick}
      />

      {/* +10s / -10s feedback */}
      {skipFeedback && (
        <div
          className={`pointer-events-none absolute top-1/2 z-20 -translate-y-1/2 ${
            skipFeedback.side === "left" ? "left-[12%]" : "right-[12%]"
          }`}
        >
          <div className="rounded-full bg-black/60 px-4 py-2 text-sm font-semibold text-white">
            {skipFeedback.text}
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && !hasError && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/40">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white border-t-transparent" />
        </div>
      )}

      {/* Could not load the video */}
      {hasError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black/80 px-4 text-center text-white">
          <h2 className="text-lg font-semibold">This video could not be loaded</h2>

          <p className="max-w-sm text-sm text-gray-300">
            The file may be missing or your connection dropped.
          </p>

          <button
            onClick={retryLoading}
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-black transition hover:bg-gray-200"
          >
            <RefreshCw size={16} /> Try again
          </button>
        </div>
      )}

      {/* Watch limit of the plan reached */}
      {limitReached && !hasError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/85 px-4 text-center text-white">
          <Lock size={32} className="text-yellow-400" />

          <h2 className="text-lg font-semibold">Watch limit reached</h2>

          <p className="max-w-sm text-sm text-gray-300">
            Your {planName || "current"} plan includes{" "}
            {Math.round((limitSeconds ?? 0) / 60)} minutes of watch time per
            video. Upgrade to keep watching.
          </p>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => router.push("/subscription")}
              className="rounded-full bg-blue-600 px-5 py-2 font-semibold text-white transition hover:bg-blue-700"
            >
              View plans
            </button>

            <button
              onClick={replayFromStart}
              className="rounded-full bg-white px-5 py-2 text-black transition hover:bg-gray-200"
            >
              Watch from start
            </button>
          </div>
        </div>
      )}

      {/* Video finished */}
      {isEnded && !hasError && !limitReached && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black/70 px-4 text-center text-white">
          <h2 className="text-xl font-semibold">Video finished</h2>

          {nextVideo && (
            <p className="max-w-sm truncate text-sm text-gray-300">
              Up next: {nextVideo.videotitle}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={replayFromStart}
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-black transition hover:scale-105 hover:bg-gray-200"
            >
              <RotateCcw size={16} /> Play again
            </button>

            {nextVideo && (
              <button
                onClick={playNextVideo}
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-black transition hover:scale-105 hover:bg-gray-200"
              >
                <SkipForward size={16} /> Next video
              </button>
            )}
          </div>
        </div>
      )}

      {/* Controls */}
      <div
        className={`absolute bottom-0 left-0 z-30 w-full bg-gradient-to-t from-black/90 via-black/60 to-transparent px-3 py-3 text-white transition-opacity duration-300 sm:px-4 ${
          controlsVisible ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        {/* Progress bar (a yellow mark shows where the plan limit ends) */}
        <div className="relative mb-3">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={Math.min(currentTime, duration || 0)}
            onChange={handleSeekInput}
            disabled={!duration}
            aria-label="Seek"
            className="h-1.5 w-full cursor-pointer accent-white"
          />

          {limitMarkerPercent !== null && limitMarkerPercent < 100 && (
            <div
              className="pointer-events-none absolute top-1/2 h-3 w-0.5 -translate-y-1/2 bg-yellow-400"
              style={{ left: `${limitMarkerPercent}%` }}
              title="End of your plan's watch limit"
            />
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Left controls */}
          <div className="flex items-center justify-center gap-3 sm:justify-start">
            <button
              onClick={() => skip(-SKIP_SECONDS, "left")}
              className={buttonClass}
              title="Rewind 10 seconds"
              aria-label="Rewind 10 seconds"
            >
              <RotateCcw size={20} />
            </button>

            <button
              onClick={togglePlay}
              className={buttonClass}
              title={isPlaying ? "Pause" : "Play"}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>

            <button
              onClick={toggleMute}
              className={buttonClass}
              title={isMuted ? "Unmute" : "Mute"}
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>

            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={(event) => changeVolume(Number(event.target.value))}
              aria-label="Volume"
              className="hidden w-28 cursor-pointer sm:block"
            />
          </div>

          {/* Right controls */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-end">
            <div className="whitespace-nowrap text-xs font-medium sm:text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
              {limitApplies && limitSeconds !== null && (
                <span className="ml-2 text-yellow-300">
                  {planName ? `${planName} limit` : "Limit"}{" "}
                  {formatTime(limitSeconds)}
                </span>
              )}
            </div>

            <button
              onClick={() => skip(SKIP_SECONDS, "right")}
              className={buttonClass}
              title="Forward 10 seconds"
              aria-label="Forward 10 seconds"
            >
              <RotateCw size={20} />
            </button>

            {nextVideo && (
              <button
                onClick={playNextVideo}
                className={buttonClass}
                title={`Next: ${nextVideo.videotitle}`}
                aria-label="Next video"
              >
                <SkipForward size={20} />
              </button>
            )}

            <button
              onClick={toggleFullscreen}
              className={buttonClass}
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}