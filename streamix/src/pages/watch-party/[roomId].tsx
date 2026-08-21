import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import { socket } from "../../lib/socket";
import axiosInstance from "@/lib/AxiosInstance";
import { useUser } from "@/lib/AuthContext";

export default function WatchParty() {
    const router = useRouter();
    const { roomId, videoId } = router.query;
    const { user } = useUser();


    console.log("WATCH PARTY ROOM:", roomId);
    console.log("WATCH PARTY VIDEO:", videoId);

    const [connected, setConnected] = useState(false);
    const [participants, setParticipants] = useState<string[]>([]);
    const [mediaReady, setMediaReady] = useState(false);
    const [callConnected, setCallConnected] = useState(false);

    const [partyVideo, setPartyVideo] = useState<any>(null);
    const [videoLoading, setVideoLoading] = useState(true);

    const [isPartyVideoPlaying, setIsPartyVideoPlaying] =
        useState(false);

    const [partyVideoTime, setPartyVideoTime] =
        useState(0);

    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] =
        useState(false);

    const [isScreenSharing, setIsScreenSharing] = useState(false);

    const screenStreamRef =
        useRef<MediaStream | null>(null);

    const [messages, setMessages] = useState<
        { sender: string; message: string }[]
    >([]);

    const [chatMessage, setChatMessage] = useState("");

    const localVideoRef =
        useRef<HTMLVideoElement | null>(null);

    const remoteVideoRef =
        useRef<HTMLVideoElement | null>(null);

    const partyVideoRef =
        useRef<HTMLVideoElement | null>(null);

    const localStreamRef =
        useRef<MediaStream | null>(null);

    const peerConnectionsRef =
        useRef<Map<string, RTCPeerConnection>>(
            new Map()
        );

    // ==========================================
    // CREATE PEER CONNECTION
    // ==========================================

    const createPeerConnection = (
        participantId: string
    ) => {
        const existingConnection =
            peerConnectionsRef.current.get(
                participantId
            );

        if (existingConnection) {
            return existingConnection;
        }

        const peerConnection =
            new RTCPeerConnection({
                iceServers: [
                    {
                        urls:
                            "stun:stun.l.google.com:19302",
                    },
                ],
            });

        // Add local tracks
        const localStream =
            localStreamRef.current;

        if (localStream) {
            localStream
                .getTracks()
                .forEach((track) => {
                    peerConnection.addTrack(
                        track,
                        localStream
                    );
                });

            console.log(
                "Local audio/video tracks added to peer connection"
            );
        } else {
            console.warn(
                "Local media stream is not ready yet"
            );
        }

        // Receive remote stream
        peerConnection.ontrack = async (event) => {
            console.log(
                "Remote track received:",
                event.track.kind
            );

            if (
                remoteVideoRef.current &&
                event.streams[0]
            ) {
                remoteVideoRef.current.srcObject =
                    event.streams[0];

                try {
                    await remoteVideoRef.current.play();

                    console.log(
                        "Remote video started playing"
                    );
                } catch (error) {
                    console.error(
                        "Remote video autoplay error:",
                        error
                    );
                }

                setCallConnected(true);
            }
        };

        // ICE candidates
        peerConnection.onicecandidate = (
            event
        ) => {
            if (event.candidate) {
                socket.emit(
                    "webrtc-ice-candidate",
                    {
                        target: participantId,
                        candidate:
                            event.candidate,
                    }
                );
            }
        };

        // Connection state
        peerConnection.onconnectionstatechange =
            () => {
                console.log(
                    "WebRTC connection:",
                    peerConnection.connectionState
                );

                if (
                    peerConnection.connectionState ===
                    "connected"
                ) {
                    setCallConnected(true);
                }

                if (
                    peerConnection.connectionState ===
                    "disconnected" ||
                    peerConnection.connectionState ===
                    "failed" ||
                    peerConnection.connectionState ===
                    "closed"
                ) {
                    setCallConnected(false);
                }
            };

        peerConnectionsRef.current.set(
            participantId,
            peerConnection
        );

        return peerConnection;
    };

    // ==========================================
    // CREATE OFFER
    // ==========================================

    const createOffer = async (
        participantId: string
    ) => {
        try {
            const peerConnection =
                createPeerConnection(
                    participantId
                );

            const offer =
                await peerConnection.createOffer();

            await peerConnection.setLocalDescription(
                offer
            );

            socket.emit("webrtc-offer", {
                target: participantId,
                offer,
            });

            console.log(
                "WebRTC offer sent to:",
                participantId
            );
        } catch (error) {
            console.error(
                "Create offer error:",
                error
            );
        }
    };

    // ==========================================
    // INITIALIZE MEDIA
    // ==========================================

    const initializeMedia = async () => {
        try {
            const stream =
                await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true,
                });

            localStreamRef.current = stream;

            if (localVideoRef.current) {
                localVideoRef.current.srcObject =
                    stream;
            }

            setMediaReady(true);

            console.log(
                "Camera and microphone ready"
            );

            return true;
        } catch (error) {
            console.error(
                "Media access error:",
                error
            );

            setMediaReady(false);

            return false;
        }
    };

    // ==========================================
    // MUTE / UNMUTE
    // ==========================================

    const togglePartyVideo = () => {
        if (!partyVideoRef.current) {
            return;
        }

        if (partyVideoRef.current.paused) {
            partyVideoRef.current.play();

            socket.emit("watch-party-play", {
                roomId: String(roomId),
                currentTime: partyVideoRef.current.currentTime,
            });
        } else {
            partyVideoRef.current.pause();

            socket.emit("watch-party-pause", {
                roomId: String(roomId),
                currentTime: partyVideoRef.current.currentTime,
            });
        }
    };

    const sendChatMessage = () => {
        const message = chatMessage.trim();

        if (!message || !socket.id) {
            return;
        }

        socket.emit("watch-party-chat", {
            roomId: String(roomId),
            message,
        });

        setChatMessage("");
    };



    const toggleMute = () => {
        if (!localStreamRef.current) {
            return;
        }

        const audioTracks =
            localStreamRef.current.getAudioTracks();

        audioTracks.forEach((track) => {
            track.enabled = !track.enabled;
        });

        setIsMuted(
            !audioTracks.some(
                (track) => track.enabled
            )
        );
    };

    // ==========================================
    // CAMERA ON / OFF
    // ==========================================

    const toggleCamera = () => {
        if (!localStreamRef.current) {
            return;
        }

        const videoTracks =
            localStreamRef.current.getVideoTracks();

        videoTracks.forEach((track) => {
            track.enabled = !track.enabled;
        });

        setIsCameraOff(
            !videoTracks.some(
                (track) => track.enabled
            )
        );
    };

    const startScreenSharing = async () => {
        try {
            const screenStream =
                await navigator.mediaDevices.getDisplayMedia({
                    video: true,
                    audio: false,
                });

            screenStreamRef.current = screenStream;

            const screenTrack =
                screenStream.getVideoTracks()[0];

            peerConnectionsRef.current.forEach(
                async (peerConnection) => {
                    const sender =
                        peerConnection
                            .getSenders()
                            .find(
                                (sender) =>
                                    sender.track?.kind ===
                                    "video"
                            );

                    if (sender) {
                        await sender.replaceTrack(
                            screenTrack
                        );
                    }
                }
            );

            setIsScreenSharing(true);

            screenTrack.onended = () => {
                stopScreenSharing();
            };
        } catch (error) {
            console.error(
                "Screen sharing error:",
                error
            );
        }
    };

    const stopScreenSharing = async () => {
        const screenStream = screenStreamRef.current;

        if (!screenStream) {
            return;
        }

        screenStream.getTracks().forEach((track) => {
            track.stop();
        });

        screenStreamRef.current = null;

        const cameraTrack =
            localStreamRef.current?.getVideoTracks()[0];

        if (cameraTrack) {
            peerConnectionsRef.current.forEach(
                async (peerConnection) => {
                    const sender =
                        peerConnection
                            .getSenders()
                            .find(
                                (sender) =>
                                    sender.track?.kind ===
                                    "video"
                            );

                    if (sender) {
                        await sender.replaceTrack(
                            cameraTrack
                        );
                    }
                }
            );
        }

        setIsScreenSharing(false);
    };


    useEffect(() => {
        if (!router.isReady || !videoId) {
            return;
        }

        if (typeof videoId !== "string") {
            return;
        }

        const fetchPartyVideo = async () => {
            try {
                setVideoLoading(true);

                const userId = user?._id;

                if (!userId) {
                    console.log("User not loaded yet");
                    return;
                }

                const response = await axiosInstance.get(
                    `/video/${videoId}?userId=${userId}`
                );

                console.log(
                    "WATCH PARTY VIDEO DATA:",
                    response.data
                );

                console.log(
                    "WATCH PARTY VIDEO FILEPATH:",
                    response.data.result?.filepath
                );

                setPartyVideo(response.data.result);
            } catch (error) {
                console.error(
                    "Error fetching watch party video:",
                    error
                );
            } finally {
                setVideoLoading(false);
            }
        };

        fetchPartyVideo();
    }, [router.isReady, videoId, user?._id]);

    // ==========================================
    // LEAVE CALL
    // ==========================================

    const leaveCall = () => {
        const room = String(roomId);

        console.log(
            "Leaving watch party..."
        );

        // Tell other participants
        if (socket.connected) {
            socket.emit(
                "leave-room",
                room
            );
        }

        // Close all peer connections
        peerConnectionsRef.current.forEach(
            (peerConnection) => {
                peerConnection.close();
            }
        );

        peerConnectionsRef.current.clear();

        // Stop camera and microphone
        if (localStreamRef.current) {
            localStreamRef.current
                .getTracks()
                .forEach((track) => {
                    track.stop();
                });

            localStreamRef.current = null;
        }

        // Remove local video
        if (localVideoRef.current) {
            localVideoRef.current.srcObject =
                null;
        }

        // Remove remote video
        if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject =
                null;
        }

        setMediaReady(false);
        setCallConnected(false);

        setIsMuted(false);
        setIsCameraOff(false);

        setParticipants([]);

        // Disconnect socket
        socket.disconnect();

        // Go back to previous page
        router.back();
    };

    // ==========================================
    // MAIN EFFECT
    // ==========================================

    useEffect(() => {
        if (!router.isReady || !roomId) {
            return;
        }

        const room = String(roomId);

        setParticipants([]);

        // ==========================================
        // SOCKET CONNECT
        // ==========================================

        const handleConnect = () => {
            console.log(
                "Connected to socket:",
                socket.id
            );

            console.log(
                "Joining watch party room:",
                room
            );

            setConnected(true);

            socket.emit(
                "join-room",
                room
            );
        };

        // ==========================================
        // EXISTING PARTICIPANTS
        // ==========================================

        const handleExistingParticipants = ({
            participants,
        }: {
            participants: string[];
        }) => {
            console.log(
                "Existing participants:",
                participants
            );

            setParticipants(participants);
        };

        // ==========================================
        // NEW PARTICIPANT
        // ==========================================

        const handleParticipantJoined = async ({
            socketId,
        }: {
            socketId: string;
        }) => {
            console.log(
                "Participant joined:",
                socketId
            );

            setParticipants((prev) => {
                if (prev.includes(socketId)) {
                    return prev;
                }

                return [...prev, socketId];
            });

            await createOffer(socketId);
        };

        // ==========================================
        // WEBRTC OFFER
        // ==========================================

        const handleWebRTCOffer = async ({
            sender,
            offer,
        }: {
            sender: string;
            offer: RTCSessionDescriptionInit;
        }) => {
            try {
                console.log(
                    "Received WebRTC offer from:",
                    sender
                );

                const peerConnection =
                    createPeerConnection(
                        sender
                    );

                await peerConnection.setRemoteDescription(
                    new RTCSessionDescription(
                        offer
                    )
                );

                const answer =
                    await peerConnection.createAnswer();

                await peerConnection.setLocalDescription(
                    answer
                );

                socket.emit(
                    "webrtc-answer",
                    {
                        target: sender,
                        answer,
                    }
                );

                console.log(
                    "WebRTC answer sent"
                );
            } catch (error) {
                console.error(
                    "WebRTC offer error:",
                    error
                );
            }
        };

        // ==========================================
        // WEBRTC ANSWER
        // ==========================================

        const handleWebRTCAnswer = async ({
            sender,
            answer,
        }: {
            sender: string;
            answer: RTCSessionDescriptionInit;
        }) => {
            try {
                console.log(
                    "Received WebRTC answer from:",
                    sender
                );

                const peerConnection =
                    peerConnectionsRef.current.get(
                        sender
                    );

                if (!peerConnection) {
                    return;
                }

                await peerConnection.setRemoteDescription(
                    new RTCSessionDescription(
                        answer
                    )
                );
            } catch (error) {
                console.error(
                    "WebRTC answer error:",
                    error
                );
            }
        };

        // ==========================================
        // ICE CANDIDATE
        // ==========================================

        const handleICECandidate = async ({
            sender,
            candidate,
        }: {
            sender: string;
            candidate: RTCIceCandidateInit;
        }) => {
            try {
                const peerConnection =
                    peerConnectionsRef.current.get(
                        sender
                    );

                if (!peerConnection) {
                    return;
                }

                await peerConnection.addIceCandidate(
                    new RTCIceCandidate(
                        candidate
                    )
                );
            } catch (error) {
                console.error(
                    "ICE candidate error:",
                    error
                );
            }
        };


        const handlePartyPlay = ({
            currentTime,
        }: {
            currentTime: number;
        }) => {
            if (!partyVideoRef.current) {
                return;
            }

            partyVideoRef.current.currentTime =
                currentTime;

            partyVideoRef.current.play().catch((error) => {
                console.error(
                    "Party video play error:",
                    error
                );
            });
        };

        const handlePartyPause = ({
            currentTime,
        }: {
            currentTime: number;
        }) => {
            if (!partyVideoRef.current) {
                return;
            }

            partyVideoRef.current.currentTime =
                currentTime;

            partyVideoRef.current.pause();
        };

        const handlePartySeek = ({
            currentTime,
        }: {
            currentTime: number;
        }) => {
            if (!partyVideoRef.current) {
                return;
            }

            partyVideoRef.current.currentTime =
                currentTime;
        };

        const handlePartyChat = ({
            sender,
            message,
        }: {
            sender: string;
            message: string;
        }) => {
            setMessages((prev) => [
                ...prev,
                {
                    sender,
                    message,
                },
            ]);
        };

        // ==========================================
        // PARTICIPANT LEFT
        // ==========================================

        const handleParticipantLeft = ({
            socketId,
        }: {
            socketId: string;
        }) => {
            console.log(
                "Participant left:",
                socketId
            );

            setParticipants((prev) =>
                prev.filter(
                    (id) => id !== socketId
                )
            );

            const peerConnection =
                peerConnectionsRef.current.get(
                    socketId
                );

            if (peerConnection) {
                peerConnection.close();

                peerConnectionsRef.current.delete(
                    socketId
                );
            }

            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject =
                    null;
            }

            setCallConnected(false);
        };

        // ==========================================
        // DISCONNECT
        // ==========================================

        const handleDisconnect = () => {
            console.log(
                "Socket disconnected"
            );

            setConnected(false);
            setParticipants([]);
            setCallConnected(false);
        };

        // ==========================================
        // SOCKET LISTENERS
        // ==========================================

        socket.on(
            "connect",
            handleConnect
        );

        socket.on(
            "existing-participants",
            handleExistingParticipants
        );

        socket.on(
            "participant-joined",
            handleParticipantJoined
        );

        socket.on(
            "webrtc-offer",
            handleWebRTCOffer
        );

        socket.on(
            "webrtc-answer",
            handleWebRTCAnswer
        );

        socket.on(
            "webrtc-ice-candidate",
            handleICECandidate
        );

        socket.on(
            "watch-party-play",
            handlePartyPlay
        );

        socket.on(
            "watch-party-pause",
            handlePartyPause
        );

        socket.on(
            "watch-party-seek",
            handlePartySeek
        );

        socket.on(
            "watch-party-chat",
            handlePartyChat
        );

        socket.on(
            "participant-left",
            handleParticipantLeft
        );

        socket.on(
            "disconnect",
            handleDisconnect
        );

        // ==========================================
        // START MEDIA BEFORE SOCKET / WEBRTC
        // ==========================================

        const startWatchParty = async () => {
            console.log("Starting Watch Party...");

            const mediaStarted = await initializeMedia();

            if (!mediaStarted) {
                console.error(
                    "Cannot start watch party without camera/microphone access."
                );
                return;
            }

            console.log("Media initialized successfully");

            if (!socket.connected) {
                console.log("Connecting socket...");
                socket.connect();
            } else {
                console.log("Socket already connected");
                handleConnect();
            }
        };

        startWatchParty();

        // ==========================================
        // CLEANUP
        // ==========================================

        return () => {
            if (socket.connected) {
                socket.emit(
                    "leave-room",
                    room
                );
            }

            socket.off(
                "connect",
                handleConnect
            );

            socket.off(
                "existing-participants",
                handleExistingParticipants
            );

            socket.off(
                "participant-joined",
                handleParticipantJoined
            );

            socket.off(
                "webrtc-offer",
                handleWebRTCOffer
            );

            socket.off(
                "webrtc-answer",
                handleWebRTCAnswer
            );

            socket.off(
                "webrtc-ice-candidate",
                handleICECandidate
            );

            socket.off(
                "watch-party-play",
                handlePartyPlay
            );

            socket.off(
                "watch-party-pause",
                handlePartyPause
            );

            socket.off(
                "watch-party-seek",
                handlePartySeek
            );

            socket.off(
                "watch-party-chat",
                handlePartyChat
            );

            socket.off(
                "participant-left",
                handleParticipantLeft
            );

            socket.off(
                "disconnect",
                handleDisconnect
            );

            peerConnectionsRef.current.forEach(
                (peerConnection) => {
                    peerConnection.close();
                }
            );

            peerConnectionsRef.current.clear();

            if (localStreamRef.current) {
                localStreamRef.current
                    .getTracks()
                    .forEach((track) => {
                        track.stop();
                    });

                localStreamRef.current = null;
            }

            if (localVideoRef.current) {
                localVideoRef.current.srcObject =
                    null;
            }

            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject =
                    null;
            }

            socket.disconnect();
        };
    }, [router.isReady, roomId]);

    return (
        <div className="min-h-screen bg-gray-950 px-4 py-6 text-white sm:px-6 lg:px-8">
            {/* HEADER */}
            <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-xl sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold sm:text-3xl">
                        Watch Party
                    </h1>
                    <p className="mt-1 text-sm text-gray-400">
                        Room ID: {roomId}
                    </p>
                </div>

                <div className="flex flex-wrap gap-2 text-sm">
                    <span
                        className={`rounded-full px-3 py-1 ${
                            connected
                                ? "bg-green-500/15 text-green-400"
                                : "bg-red-500/15 text-red-400"
                        }`}
                    >
                        ● {connected ? "Connected" : "Disconnected"}
                    </span>

                    <span
                        className={`rounded-full px-3 py-1 ${
                            callConnected
                                ? "bg-blue-500/15 text-blue-400"
                                : "bg-gray-800 text-gray-400"
                        }`}
                    >
                        ● {callConnected ? "Call Connected" : "Waiting"}
                    </span>
                </div>
            </div>

            {/* SHARED WATCH PARTY VIDEO */}
            <div className="overflow-hidden rounded-2xl border border-gray-800 bg-black shadow-2xl">
                <div className="flex items-center justify-between border-b border-gray-800 bg-gray-900 px-4 py-3">
                    <div>
                        <p className="font-semibold text-white">
                            Watch Party Video
                        </p>
                        <p className="text-xs text-gray-400">
                            Synchronized playback
                        </p>
                    </div>

                    <span className="rounded-full bg-purple-500/15 px-3 py-1 text-xs font-medium text-purple-400">
                        LIVE
                    </span>
                </div>

                {videoLoading ? (
                    <div className="flex aspect-video items-center justify-center bg-gray-950 text-sm text-gray-400">
                        Loading video...
                    </div>
                ) : partyVideo ? (
                    <div>
                        <video
                            ref={partyVideoRef}
                            src={`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/${partyVideo.filepath.replace(/\\/g, "/")}`}
                            controls
                            className="aspect-video w-full bg-black object-contain"
                            onSeeked={() => {
                                if (!partyVideoRef.current) {
                                    return;
                                }

                                socket.emit("watch-party-seek", {
                                    roomId: String(roomId),
                                    currentTime:
                                        partyVideoRef.current.currentTime,
                                });
                            }}
                        />

                        <div className="flex justify-center border-t border-gray-800 bg-gray-950 px-4 py-4">
                            <button
                                onClick={togglePartyVideo}
                                className="rounded-full bg-purple-600 px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-purple-700 active:scale-95"
                            >
                                ▶ / ⏸ Play / Pause
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex aspect-video items-center justify-center bg-gray-950 text-sm text-gray-400">
                        Video unavailable
                    </div>
                )}
            </div>

            {/* VIDEO AREA */}
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* LOCAL VIDEO */}
                <div className="overflow-hidden rounded-2xl border border-gray-800 bg-black shadow-xl">
                    <div className="flex items-center justify-between border-b border-gray-800 bg-gray-900 px-4 py-3">
                        <div>
                            <p className="text-sm font-semibold text-white">
                                You
                            </p>
                            <p className="text-xs text-gray-500">
                                Your camera
                            </p>
                        </div>

                        <span className="rounded-full bg-green-500/10 px-2.5 py-1 text-xs text-green-400">
                            Live
                        </span>
                    </div>

                    <video
                        ref={localVideoRef}
                        autoPlay
                        muted
                        playsInline
                        className="aspect-video w-full bg-black object-cover"
                    />
                </div>

                {/* REMOTE VIDEO */}
                <div className="overflow-hidden rounded-2xl border border-gray-800 bg-black shadow-xl">
                    <div className="flex items-center justify-between border-b border-gray-800 bg-gray-900 px-4 py-3">
                        <div>
                            <p className="text-sm font-semibold text-white">
                                Participant
                            </p>
                            <p className="text-xs text-gray-500">
                                Remote camera
                            </p>
                        </div>

                        <span
                            className={`rounded-full px-2.5 py-1 text-xs ${
                                callConnected
                                    ? "bg-blue-500/10 text-blue-400"
                                    : "bg-gray-800 text-gray-500"
                            }`}
                        >
                            {callConnected ? "Connected" : "Waiting"}
                        </span>
                    </div>

                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="aspect-video w-full bg-black object-cover"
                    />
                </div>
            </div>

            {/* CONTROLS */}
            <div className="mt-6 rounded-2xl border border-gray-800 bg-gray-900 p-4 shadow-xl">
                <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                    <button
                        onClick={toggleMute}
                        className="rounded-xl bg-gray-800 px-5 py-3 font-semibold text-white transition hover:bg-gray-700 active:scale-95"
                    >
                        {isMuted ? "🎤 Unmute" : "🎤 Mute"}
                    </button>

                    <button
                        onClick={toggleCamera}
                        className="rounded-xl bg-gray-800 px-5 py-3 font-semibold text-white transition hover:bg-gray-700 active:scale-95"
                    >
                        {isCameraOff
                            ? "📷 Camera On"
                            : "📷 Camera Off"}
                    </button>

                    <button
                        onClick={
                            isScreenSharing
                                ? stopScreenSharing
                                : startScreenSharing
                        }
                        className={`rounded-xl px-5 py-3 font-semibold text-white transition active:scale-95 ${
                            isScreenSharing
                                ? "bg-orange-600 hover:bg-orange-700"
                                : "bg-gray-800 hover:bg-gray-700"
                        }`}
                    >
                        {isScreenSharing
                            ? "🛑 Stop Sharing"
                            : "🖥️ Share Screen"}
                    </button>

                    <button
                        onClick={leaveCall}
                        className="rounded-xl bg-red-600 px-5 py-3 font-semibold text-white transition hover:bg-red-700 active:scale-95"
                    >
                        📞 Leave Call
                    </button>
                </div>
            </div>

            {/* BOTTOM CONTENT */}
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* PARTICIPANTS */}
                <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-semibold text-white">
                                Participants
                            </h2>

                            <p className="mt-1 text-sm text-gray-500">
                                {participants.length + 1}{" "}
                                {participants.length + 1 === 1
                                    ? "person"
                                    : "people"}{" "}
                                in this watch party
                            </p>
                        </div>

                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10 text-purple-400">
                            👥
                        </div>
                    </div>

                    <div className="mt-5 space-y-2">
                        {/* CURRENT USER */}
                        <div className="flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-950 px-3 py-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 font-semibold text-white">
                                Y
                            </div>

                            <div className="min-w-0 flex-1">
                                <p className="font-medium text-white">
                                    You
                                </p>

                                <p className="mt-0.5 text-xs text-green-400">
                                    ● Connected
                                </p>
                            </div>

                            <span className="rounded-full bg-green-500/10 px-2.5 py-1 text-xs text-green-400">
                                Host
                            </span>
                        </div>

                        {/* OTHER PARTICIPANTS */}
                        {participants.length > 0 ? (
                            participants.map((id) => (
                                <div
                                    key={id}
                                    className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-3 transition hover:border-gray-800 hover:bg-gray-950"
                                >
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-sm">
                                        👤
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium text-white">
                                            Participant
                                        </p>

                                        <p className="truncate text-xs text-green-400">
                                            ● Connected
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="rounded-xl border border-dashed border-gray-800 px-4 py-6 text-center">
                                <p className="text-sm text-gray-500">
                                    No other participants yet.
                                </p>

                                <p className="mt-1 text-xs text-gray-600">
                                    Share the room to invite someone.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* CHAT */}
                <div className="flex flex-col rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-semibold text-white">
                                Chat
                            </h2>

                            <p className="mt-1 text-sm text-gray-500">
                                Talk with everyone in the party
                            </p>
                        </div>

                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10 text-purple-400">
                            💬
                        </div>
                    </div>

                    {/* CHAT MESSAGES */}
                    <div className="mt-5 max-h-72 flex-1 space-y-3 overflow-y-auto rounded-xl bg-gray-950 p-3">
                        {messages.length > 0 ? (
                            messages.map((item, index) => (
                                <div
                                    key={index}
                                    className="rounded-xl border border-gray-800 bg-gray-900 px-4 py-3"
                                >
                                    <p className="text-xs font-semibold text-purple-400">
                                        {item.sender === socket.id
                                            ? "You"
                                            : "Participant"}
                                    </p>

                                    <p className="mt-1 break-words text-sm text-gray-200">
                                        {item.message}
                                    </p>
                                </div>
                            ))
                        ) : (
                            <div className="flex h-40 items-center justify-center text-center">
                                <div>
                                    <p className="text-sm text-gray-500">
                                        No messages yet.
                                    </p>

                                    <p className="mt-1 text-xs text-gray-600">
                                        Start the conversation!
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* MESSAGE INPUT */}
                    <div className="mt-4 flex gap-2">
                        <input
                            type="text"
                            value={chatMessage}
                            onChange={(event) =>
                                setChatMessage(event.target.value)
                            }
                            onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                    sendChatMessage();
                                }
                            }}
                            placeholder="Type a message..."
                            className="min-w-0 flex-1 rounded-xl border border-gray-700 bg-gray-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-purple-500"
                        />

                        <button
                            onClick={sendChatMessage}
                            className="rounded-xl bg-purple-600 px-5 py-3 font-semibold text-white transition hover:bg-purple-700 active:scale-95"
                        >
                            Send
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
