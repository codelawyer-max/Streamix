import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ScreenShare,
  ScreenShareOff,
  PhoneOff,
  Copy,
  Circle,
  Square,
  Send,
  Users,
} from "lucide-react";
import { socket } from "../../lib/socket";
import axiosInstance from "@/lib/AxiosInstance";
import { useUser } from "@/lib/AuthContext";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

// STUN works for many networks, but a TURN relay is needed for strict NATs
// (mobile data, college/office Wi-Fi). Add the NEXT_PUBLIC_TURN_* variables
// in .env and in Vercel to enable it.
const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  ...(process.env.NEXT_PUBLIC_TURN_URL
    ? [
        {
          urls: process.env.NEXT_PUBLIC_TURN_URL.split(","),
          username: process.env.NEXT_PUBLIC_TURN_USERNAME,
          credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
        } as RTCIceServer,
      ]
    : []),
];

type Participant = {
  id: string;
  name: string;
  muted: boolean;
  cameraOff: boolean;
};

type ChatMessage = {
  sender: string;
  name: string;
  message: string;
  at: number;
};

type MediaMode = "full" | "audio" | "none";

// One tile per remote participant
function RemoteTile({
  stream,
  participant,
}: {
  stream: MediaStream;
  participant?: Participant;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = stream;
      ref.current.play().catch(() => {});
    }
  }, [stream]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-800 bg-black">
      <video
        ref={ref}
        autoPlay
        playsInline
        className="aspect-video w-full bg-black object-cover"
      />
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1 text-xs text-white">
        {participant?.muted && <MicOff size={12} className="text-red-400" />}
        {participant?.name || "Participant"}
      </div>
    </div>
  );
}

export default function WatchParty() {
  const router = useRouter();
  const { roomId, videoId } = router.query;
  const { user } = useUser();

  const [connected, setConnected] = useState(false);
  const [hostId, setHostId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [roomVideoId, setRoomVideoId] = useState<string | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<
    Record<string, MediaStream>
  >({});
  const [mediaMode, setMediaMode] = useState<MediaMode | null>(null);

  const [partyVideo, setPartyVideo] = useState<any>(null);
  const [videoLoading, setVideoLoading] = useState(true);

  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatMessage, setChatMessage] = useState("");

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const partyVideoRef = useRef<HTMLVideoElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(
    new Map()
  );

  // Playback state received before the <video> was ready
  const pendingStateRef = useRef<{
    playing: boolean;
    currentTime: number;
  } | null>(null);

  // Prevents echo loops: while we apply a remote command, our own
  // play/pause/seeked events must not be sent back to the room.
  const applyingRemoteRef = useRef(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const displayName = user?.name || user?.username || "Guest";
  const isHost = connected && hostId === socket.id;
  const effectiveVideoId =
    typeof videoId === "string" ? videoId : roomVideoId;

  // ==========================================
  // HELPERS
  // ==========================================

  const applyRemote = (action: () => void) => {
    applyingRemoteRef.current = true;
    try {
      action();
    } finally {
      setTimeout(() => {
        applyingRemoteRef.current = false;
      }, 500);
    }
  };

  const playSafely = (video: HTMLVideoElement) => {
    video.play().catch(() => {
      toast("Tap the video once to start playback in sync.");
    });
  };

  const applyPlaybackState = (state: {
    playing: boolean;
    currentTime: number;
  }) => {
    const video = partyVideoRef.current;

    // Video not loaded yet -> apply it on loadedmetadata
    if (!video || video.readyState < 1) {
      pendingStateRef.current = state;
      return;
    }

    applyRemote(() => {
      video.currentTime = state.currentTime;
      if (state.playing) playSafely(video);
      else video.pause();
    });
  };

  // ==========================================
  // WEBRTC
  // ==========================================

  const createPeerConnection = (participantId: string) => {
    const existing = peerConnectionsRef.current.get(participantId);
    if (existing) return existing;

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    const local = localStreamRef.current;
    const screenTrack = screenStreamRef.current?.getVideoTracks()[0];
    const audioTracks = local?.getAudioTracks() ?? [];
    const videoTracks = screenTrack
      ? [screenTrack]
      : local?.getVideoTracks() ?? [];
    const stream = local ?? screenStreamRef.current ?? new MediaStream();

    [...audioTracks, ...videoTracks].forEach((track) =>
      pc.addTrack(track, stream)
    );

    // Users without a camera/mic must still be able to RECEIVE media
    if (audioTracks.length === 0) {
      pc.addTransceiver("audio", { direction: "recvonly" });
    }
    if (videoTracks.length === 0) {
      pc.addTransceiver("video", { direction: "recvonly" });
    }

    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      if (!remoteStream) return;
      setRemoteStreams((prev) => ({ ...prev, [participantId]: remoteStream }));
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("webrtc-ice-candidate", {
          target: participantId,
          candidate: event.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed") {
        toast.error(
          "A connection failed. If this keeps happening, a TURN server is needed."
        );
      }
    };

    peerConnectionsRef.current.set(participantId, pc);
    return pc;
  };

  const sendOffer = async (participantId: string) => {
    const pc = peerConnectionsRef.current.get(participantId);
    if (!pc) return;
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("webrtc-offer", { target: participantId, offer });
  };

  const flushCandidates = async (id: string, pc: RTCPeerConnection) => {
    const queued = pendingCandidatesRef.current.get(id) ?? [];
    pendingCandidatesRef.current.delete(id);
    for (const candidate of queued) {
      try {
        await pc.addIceCandidate(candidate);
      } catch (error) {
        console.warn("Queued ICE candidate failed:", error);
      }
    }
  };

  const closePeer = (id: string) => {
    peerConnectionsRef.current.get(id)?.close();
    peerConnectionsRef.current.delete(id);
    pendingCandidatesRef.current.delete(id);
    setRemoteStreams((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const closeAllPeers = () => {
    Array.from(peerConnectionsRef.current.keys()).forEach(closePeer);
  };

  // Put a video track (screen or camera) on every connection
  const setVideoTrackOnAll = async (
    track: MediaStreamTrack | null,
    stream: MediaStream
  ) => {
    for (const [id, pc] of Array.from(peerConnectionsRef.current.entries())) {
      const transceiver = pc
        .getTransceivers()
        .find((t) => t.receiver.track.kind === "video");

      if (transceiver) {
        const wasReceiveOnly = !transceiver.sender.track && Boolean(track);
        await transceiver.sender.replaceTrack(track);
        if (wasReceiveOnly) {
          transceiver.direction = "sendrecv";
          await sendOffer(id); // renegotiate
        }
      } else if (track) {
        pc.addTrack(track, stream);
        await sendOffer(id);
      }
    }
  };

  // ==========================================
  // MEDIA
  // ==========================================

  const initializeMedia = async (): Promise<{
    stream: MediaStream | null;
    mode: MediaMode;
  }> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      return { stream: null, mode: "none" };
    }

    const attempts: { constraints: MediaStreamConstraints; mode: MediaMode }[] =
      [
        {
          constraints: {
            video: { width: { ideal: 640 }, height: { ideal: 360 } },
            audio: true,
          },
          mode: "full",
        },
        { constraints: { video: false, audio: true }, mode: "audio" },
      ];

    for (const attempt of attempts) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(
          attempt.constraints
        );
        return { stream, mode: attempt.mode };
      } catch (error) {
        console.warn("getUserMedia failed:", attempt.mode, error);
      }
    }

    return { stream: null, mode: "none" };
  };

  const toggleMute = () => {
    const tracks = localStreamRef.current?.getAudioTracks() ?? [];
    if (tracks.length === 0) {
      toast.error("No microphone available.");
      return;
    }
    const nextMuted = tracks[0].enabled; // enabled now -> becomes muted
    tracks.forEach((track) => (track.enabled = !nextMuted));
    setIsMuted(nextMuted);
    socket.emit("media-state", { muted: nextMuted, cameraOff: isCameraOff });
  };

  const toggleCamera = () => {
    const tracks = localStreamRef.current?.getVideoTracks() ?? [];
    if (tracks.length === 0) {
      toast.error("No camera available.");
      return;
    }
    const nextOff = tracks[0].enabled;
    tracks.forEach((track) => (track.enabled = !nextOff));
    setIsCameraOff(nextOff);
    socket.emit("media-state", { muted: isMuted, cameraOff: nextOff });
  };

  // ==========================================
  // SCREEN SHARING
  // ==========================================

  const stopScreenSharing = async () => {
    const screenStream = screenStreamRef.current;
    if (!screenStream) return;

    screenStream.getTracks().forEach((track) => track.stop());
    screenStreamRef.current = null;

    const cameraTrack = localStreamRef.current?.getVideoTracks()[0] ?? null;
    await setVideoTrackOnAll(
      cameraTrack,
      localStreamRef.current ?? new MediaStream()
    );

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
    setIsScreenSharing(false);
  };

  const startScreenSharing = async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      toast.error("Screen sharing is not supported on this device.");
      return;
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      const screenTrack = screenStream.getVideoTracks()[0];

      screenStreamRef.current = screenStream;
      await setVideoTrackOnAll(screenTrack, screenStream);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = screenStream;
      }
      setIsScreenSharing(true);

      // Browser's own "Stop sharing" button
      screenTrack.onended = () => {
        stopScreenSharing();
      };
    } catch (error) {
      console.warn("Screen sharing cancelled or failed:", error);
    }
  };

  // ==========================================
  // RECORDING (host only, saved locally)
  // ==========================================

  const startRecording = () => {
    const video = partyVideoRef.current as any;
    const captured: MediaStream | undefined =
      video?.captureStream?.() ?? video?.mozCaptureStream?.();

    if (!captured) {
      toast.error("Recording is not supported in this browser.");
      return;
    }

    // Mix the video's sound and your microphone into one audio track
    const ctx = new AudioContext();
    const destination = ctx.createMediaStreamDestination();
    const videoAudio = captured.getAudioTracks();
    if (videoAudio.length) {
      ctx
        .createMediaStreamSource(new MediaStream(videoAudio))
        .connect(destination);
    }
    const micAudio = localStreamRef.current?.getAudioTracks() ?? [];
    if (micAudio.length) {
      ctx
        .createMediaStreamSource(new MediaStream(micAudio))
        .connect(destination);
    }
    audioCtxRef.current = ctx;

    const output = new MediaStream([
      ...captured.getVideoTracks(),
      ...destination.stream.getAudioTracks(),
    ]);

    const mimeType = ["video/webm;codecs=vp8,opus", "video/webm"].find((type) =>
      MediaRecorder.isTypeSupported(type)
    );

    const recorder = new MediaRecorder(output, mimeType ? { mimeType } : {});
    recordChunksRef.current = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) recordChunksRef.current.push(event.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(recordChunksRef.current, { type: "video/webm" });
      if (blob.size > 0) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `watch-party-${Date.now()}.webm`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        toast.success("Recording saved to your device.");
      }
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
    };

    recorder.start(1000);
    recorderRef.current = recorder;
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    recorderRef.current = null;
    setIsRecording(false);
  };

  // ==========================================
  // CHAT / INVITE / LEAVE
  // ==========================================

  const sendChatMessage = () => {
    const message = chatMessage.trim();
    if (!message || !socket.connected) return;
    socket.emit("watch-party-chat", { message });
    setChatMessage("");
  };

  const copyInviteLink = async () => {
    const params = effectiveVideoId ? `?videoId=${effectiveVideoId}` : "";
    const link = `${window.location.origin}/watch-party/${roomId}${params}`;

    try {
      if (navigator.share) {
        await navigator.share({ title: "Join my Streamix Watch Party", url: link });
      } else {
        await navigator.clipboard.writeText(link);
        toast.success("Invite link copied.");
      }
    } catch {
      // user closed the share sheet -> nothing to do
    }
  };

  const leaveCall = () => {
    stopRecording();
    // The effect cleanup closes connections and stops the camera
    if (window.history.length > 1) router.back();
    else router.push("/");
  };

  // ==========================================
  // LOAD THE PARTY VIDEO
  // ==========================================

  useEffect(() => {
    if (!router.isReady || !effectiveVideoId || !user?._id) return;

    let cancelled = false;

    const fetchPartyVideo = async () => {
      try {
        setVideoLoading(true);
        const response = await axiosInstance.get(
          `/video/${effectiveVideoId}?userId=${user._id}`
        );
        if (!cancelled) setPartyVideo(response.data.result);
      } catch (error) {
        console.error("Error fetching watch party video:", error);
      } finally {
        if (!cancelled) setVideoLoading(false);
      }
    };

    fetchPartyVideo();
    return () => {
      cancelled = true;
    };
  }, [router.isReady, effectiveVideoId, user?._id]);

  // ==========================================
  // HOST HEARTBEAT (corrects drift every 5s)
  // ==========================================

  useEffect(() => {
    if (!isHost) return;

    const timer = setInterval(() => {
      const video = partyVideoRef.current;
      if (video && socket.connected) {
        socket.emit("watch-party-sync", {
          currentTime: video.currentTime,
          playing: !video.paused,
        });
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [isHost]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ==========================================
  // MAIN EFFECT: media + socket + signaling
  // ==========================================

  useEffect(() => {
    if (!router.isReady || !roomId || !user?._id) return;

    const room = String(roomId);
    let cancelled = false;

    const handleConnect = () => {
      setConnected(true);
      socket.emit("join-room", {
        roomId: room,
        videoId: typeof videoId === "string" ? videoId : undefined,
        name: displayName,
      });
    };

    const handleDisconnect = () => {
      setConnected(false);
      closeAllPeers();
    };

    const handleRoomInfo = (info: {
      hostId: string;
      videoId: string | null;
      participants: Participant[];
    }) => {
      setHostId(info.hostId);
      setRoomVideoId(info.videoId);
      setParticipants(info.participants);
    };

    const handleRoomFull = () => {
      toast.error("This watch party is full.");
      router.push("/");
    };

    // Existing members call the newcomer
    const handleParticipantJoined = async ({
      socketId,
    }: {
      socketId: string;
    }) => {
      try {
        createPeerConnection(socketId);
        await sendOffer(socketId);
      } catch (error) {
        console.error("Create offer error:", error);
      }
    };

    const handleOffer = async ({
      sender,
      offer,
    }: {
      sender: string;
      offer: RTCSessionDescriptionInit;
    }) => {
      try {
        const pc = createPeerConnection(sender);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        await flushCandidates(sender, pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("webrtc-answer", { target: sender, answer });
      } catch (error) {
        console.error("Offer handling error:", error);
      }
    };

    const handleAnswer = async ({
      sender,
      answer,
    }: {
      sender: string;
      answer: RTCSessionDescriptionInit;
    }) => {
      try {
        const pc = peerConnectionsRef.current.get(sender);
        if (!pc) return;
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        await flushCandidates(sender, pc);
      } catch (error) {
        console.error("Answer handling error:", error);
      }
    };

    const handleIceCandidate = async ({
      sender,
      candidate,
    }: {
      sender: string;
      candidate: RTCIceCandidateInit;
    }) => {
      const pc = peerConnectionsRef.current.get(sender);

      // Candidate arrived before the remote description -> queue it
      if (!pc || !pc.remoteDescription) {
        const queue = pendingCandidatesRef.current.get(sender) ?? [];
        queue.push(candidate);
        pendingCandidatesRef.current.set(sender, queue);
        return;
      }

      try {
        await pc.addIceCandidate(candidate);
      } catch (error) {
        console.warn("ICE candidate error:", error);
      }
    };

    const handleParticipantLeft = ({ socketId }: { socketId: string }) => {
      closePeer(socketId);
    };

    // ---- playback sync from other participants ----

    const handlePartyPlay = ({ currentTime }: { currentTime: number }) => {
      applyPlaybackState({ playing: true, currentTime });
    };

    const handlePartyPause = ({ currentTime }: { currentTime: number }) => {
      applyPlaybackState({ playing: false, currentTime });
    };

    const handlePartySeek = ({ currentTime }: { currentTime: number }) => {
      const video = partyVideoRef.current;
      if (!video) return;
      applyRemote(() => {
        video.currentTime = currentTime;
      });
    };

    const handlePartyState = (state: {
      playing: boolean;
      currentTime: number;
    }) => {
      applyPlaybackState(state);
    };

    const handlePartySync = ({
      currentTime,
      playing,
    }: {
      currentTime: number;
      playing: boolean;
    }) => {
      const video = partyVideoRef.current;
      if (!video || video.readyState < 1) return;

      applyRemote(() => {
        if (Math.abs(video.currentTime - currentTime) > 1.5) {
          video.currentTime = currentTime;
        }
        if (playing && video.paused) playSafely(video);
        if (!playing && !video.paused) video.pause();
      });
    };

    const handleChat = (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("room-info", handleRoomInfo);
    socket.on("room-full", handleRoomFull);
    socket.on("participant-joined", handleParticipantJoined);
    socket.on("participant-left", handleParticipantLeft);
    socket.on("webrtc-offer", handleOffer);
    socket.on("webrtc-answer", handleAnswer);
    socket.on("webrtc-ice-candidate", handleIceCandidate);
    socket.on("watch-party-play", handlePartyPlay);
    socket.on("watch-party-pause", handlePartyPause);
    socket.on("watch-party-seek", handlePartySeek);
    socket.on("watch-party-state", handlePartyState);
    socket.on("watch-party-sync", handlePartySync);
    socket.on("watch-party-chat", handleChat);

    const start = async () => {
      const { stream, mode } = await initializeMedia();

      // Effect was cleaned up while waiting for the permission prompt
      if (cancelled) {
        stream?.getTracks().forEach((track) => track.stop());
        return;
      }

      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      setMediaMode(mode);

      if (mode !== "full") {
        toast(
          "Joined without a camera. Chat and synced playback still work."
        );
      }

      if (socket.connected) handleConnect();
      else socket.connect();
    };

    start();

    return () => {
      cancelled = true;

      if (socket.connected) socket.emit("leave-room");

      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("room-info", handleRoomInfo);
      socket.off("room-full", handleRoomFull);
      socket.off("participant-joined", handleParticipantJoined);
      socket.off("participant-left", handleParticipantLeft);
      socket.off("webrtc-offer", handleOffer);
      socket.off("webrtc-answer", handleAnswer);
      socket.off("webrtc-ice-candidate", handleIceCandidate);
      socket.off("watch-party-play", handlePartyPlay);
      socket.off("watch-party-pause", handlePartyPause);
      socket.off("watch-party-seek", handlePartySeek);
      socket.off("watch-party-state", handlePartyState);
      socket.off("watch-party-sync", handlePartySync);
      socket.off("watch-party-chat", handleChat);

      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
      recorderRef.current = null;

      closeAllPeers();

      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;

      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, roomId, user?._id]);

  // ==========================================
  // UI
  // ==========================================

  const hostName = participants.find((p) => p.id === hostId)?.name;
  const totalPeople = participants.length || 1;

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-6 text-white sm:px-6 lg:px-8">
      {/* HEADER */}
      <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-xl sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Watch Party</h1>
          <p className="mt-1 text-sm text-gray-400">
            Room: {roomId}
            {hostName ? ` · Host: ${hostName}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span
            className={`rounded-full px-3 py-1 ${
              connected
                ? "bg-green-500/15 text-green-400"
                : "bg-red-500/15 text-red-400"
            }`}
          >
            {connected ? "Connected" : "Connecting…"}
          </span>

          <button
            onClick={copyInviteLink}
            className="flex items-center gap-2 rounded-full bg-purple-600 px-4 py-1.5 font-medium transition hover:bg-purple-700 active:scale-95"
          >
            <Copy size={14} /> Invite friends
          </button>
        </div>
      </div>

      {/* SHARED VIDEO */}
      <div className="overflow-hidden rounded-2xl border border-gray-800 bg-black shadow-2xl">
        {videoLoading ? (
          <div className="flex aspect-video items-center justify-center text-sm text-gray-400">
            Loading video…
          </div>
        ) : partyVideo ? (
          <video
            ref={partyVideoRef}
            src={`${BACKEND_URL}/${partyVideo.filepath.replace(/\\/g, "/")}`}
            crossOrigin="anonymous"
            controls
            playsInline
            className="aspect-video w-full bg-black object-contain"
            onLoadedMetadata={() => {
              if (pendingStateRef.current) {
                const state = pendingStateRef.current;
                pendingStateRef.current = null;
                applyPlaybackState(state);
              }
            }}
            onPlay={() => {
              const video = partyVideoRef.current;
              if (!video || applyingRemoteRef.current) return;
              socket.emit("watch-party-play", {
                currentTime: video.currentTime,
              });
            }}
            onPause={() => {
              const video = partyVideoRef.current;
              if (!video || applyingRemoteRef.current) return;
              socket.emit("watch-party-pause", {
                currentTime: video.currentTime,
              });
            }}
            onSeeked={() => {
              const video = partyVideoRef.current;
              if (!video || applyingRemoteRef.current) return;
              socket.emit("watch-party-seek", {
                currentTime: video.currentTime,
              });
            }}
          />
        ) : (
          <div className="flex aspect-video items-center justify-center text-sm text-gray-400">
            Video unavailable
          </div>
        )}
      </div>

      {/* CALL TILES */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-2xl border border-gray-800 bg-black">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className={`aspect-video w-full bg-black ${
              isScreenSharing ? "object-contain" : "object-cover"
            }`}
          />
          {(isCameraOff || mediaMode === "audio" || mediaMode === "none") &&
            !isScreenSharing && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-sm text-gray-400">
                Camera off
              </div>
            )}
          <div className="absolute bottom-2 left-2 rounded-full bg-black/70 px-3 py-1 text-xs">
            You{isScreenSharing ? " (sharing screen)" : ""}
          </div>
        </div>

        {Object.entries(remoteStreams).map(([id, stream]) => (
          <RemoteTile
            key={id}
            stream={stream}
            participant={participants.find((p) => p.id === id)}
          />
        ))}
      </div>

      {/* CONTROLS */}
      <div className="mt-6 rounded-2xl border border-gray-800 bg-gray-900 p-4 shadow-xl">
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
          <button
            onClick={toggleMute}
            className={`flex items-center gap-2 rounded-xl px-5 py-3 font-semibold transition active:scale-95 ${
              isMuted ? "bg-red-600 hover:bg-red-700" : "bg-gray-800 hover:bg-gray-700"
            }`}
          >
            {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
            {isMuted ? "Unmute" : "Mute"}
          </button>

          <button
            onClick={toggleCamera}
            className={`flex items-center gap-2 rounded-xl px-5 py-3 font-semibold transition active:scale-95 ${
              isCameraOff ? "bg-red-600 hover:bg-red-700" : "bg-gray-800 hover:bg-gray-700"
            }`}
          >
            {isCameraOff ? <VideoOff size={18} /> : <Video size={18} />}
            {isCameraOff ? "Camera on" : "Camera off"}
          </button>

          <button
            onClick={isScreenSharing ? stopScreenSharing : startScreenSharing}
            className={`flex items-center gap-2 rounded-xl px-5 py-3 font-semibold transition active:scale-95 ${
              isScreenSharing
                ? "bg-orange-600 hover:bg-orange-700"
                : "bg-gray-800 hover:bg-gray-700"
            }`}
          >
            {isScreenSharing ? <ScreenShareOff size={18} /> : <ScreenShare size={18} />}
            {isScreenSharing ? "Stop sharing" : "Share screen"}
          </button>

          {isHost && (
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`flex items-center gap-2 rounded-xl px-5 py-3 font-semibold transition active:scale-95 ${
                isRecording
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-gray-800 hover:bg-gray-700"
              }`}
              title="Recording is saved to your device only"
            >
              {isRecording ? <Square size={18} /> : <Circle size={18} className="text-red-500" />}
              {isRecording ? "Stop & save" : "Record"}
            </button>
          )}

          <button
            onClick={leaveCall}
            className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 font-semibold transition hover:bg-red-700 active:scale-95"
          >
            <PhoneOff size={18} /> Leave
          </button>
        </div>
      </div>

      {/* PARTICIPANTS + CHAT */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Participants</h2>
              <p className="mt-1 text-sm text-gray-500">
                {totalPeople} {totalPeople === 1 ? "person" : "people"} in this
                party
              </p>
            </div>
            <Users className="text-purple-400" size={22} />
          </div>

          <div className="mt-5 space-y-2">
            {participants.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-950 px-3 py-3"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 font-semibold">
                  {p.name.charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {p.name}
                    {p.id === socket.id ? " (you)" : ""}
                  </p>
                </div>

                {p.muted && <MicOff size={16} className="text-red-400" />}
                {p.cameraOff && <VideoOff size={16} className="text-red-400" />}
                {p.id === hostId && (
                  <span className="rounded-full bg-green-500/10 px-2.5 py-1 text-xs text-green-400">
                    Host
                  </span>
                )}
              </div>
            ))}

            {participants.length <= 1 && (
              <div className="rounded-xl border border-dashed border-gray-800 px-4 py-6 text-center">
                <p className="text-sm text-gray-500">
                  No one else has joined yet.
                </p>
                <p className="mt-1 text-xs text-gray-600">
                  Use “Invite friends” to share the room link.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-xl">
          <h2 className="text-xl font-semibold">Chat</h2>

          <div className="mt-4 h-72 space-y-3 overflow-y-auto rounded-xl bg-gray-950 p-3">
            {messages.length > 0 ? (
              messages.map((item, index) => {
                const mine = item.sender === socket.id;
                return (
                  <div
                    key={index}
                    className={`rounded-xl border px-4 py-3 ${
                      mine
                        ? "border-purple-800 bg-purple-950/40"
                        : "border-gray-800 bg-gray-900"
                    }`}
                  >
                    <p className="text-xs font-semibold text-purple-400">
                      {mine ? "You" : item.name}
                      <span className="ml-2 font-normal text-gray-600">
                        {new Date(item.at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </p>
                    <p className="mt-1 break-words text-sm text-gray-200">
                      {item.message}
                    </p>
                  </div>
                );
              })
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                No messages yet. Say hi!
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="mt-4 flex gap-2">
            <input
              type="text"
              value={chatMessage}
              maxLength={500}
              onChange={(event) => setChatMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") sendChatMessage();
              }}
              placeholder="Type a message…"
              className="min-w-0 flex-1 rounded-xl border border-gray-700 bg-gray-950 px-4 py-3 text-sm outline-none transition placeholder:text-gray-600 focus:border-purple-500"
            />
            <button
              onClick={sendChatMessage}
              aria-label="Send message"
              className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-3 font-semibold transition hover:bg-purple-700 active:scale-95"
            >
              <Send size={16} /> Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}