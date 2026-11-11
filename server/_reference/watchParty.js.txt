// server/socket/watchParty.js
// All Watch Party real-time logic lives here so index.js stays small.

const MAX_PARTICIPANTS = 6;
const MAX_CHAT_LENGTH = 500;

// roomId -> {
//   hostId, videoId,
//   members: Map(socketId -> { name, muted, cameraOff, lastChatAt }),
//   state: { playing, time, at }   // last known playback state
// }
const rooms = new Map();

const isValidRoomId = (id) =>
  typeof id === "string" && id.length > 0 && id.length <= 64;

const cleanName = (name) =>
  typeof name === "string" && name.trim()
    ? name.trim().slice(0, 40)
    : "Guest";

const isNumber = (n) => typeof n === "number" && Number.isFinite(n) && n >= 0;

// Playback time "right now", accounting for time passed since last update
const currentPlaybackTime = (state) =>
  state.playing
    ? state.time + (Date.now() - state.at) / 1000
    : state.time;

export default function registerWatchParty(io) {
  // Send everyone in the room the full participant list + host
  const broadcastRoom = (roomId) => {
    const room = rooms.get(roomId);
    if (!room) return;

    io.to(roomId).emit("room-info", {
      hostId: room.hostId,
      videoId: room.videoId,
      participants: [...room.members].map(([id, m]) => ({
        id,
        name: m.name,
        muted: m.muted,
        cameraOff: m.cameraOff,
      })),
    });
  };

  const removeFromRoom = (socket) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;

    socket.leave(roomId);
    socket.data.roomId = null;

    const room = rooms.get(roomId);
    if (!room) return;

    room.members.delete(socket.id);
    socket.to(roomId).emit("participant-left", { socketId: socket.id });

    // Empty room -> delete it
    if (room.members.size === 0) {
      rooms.delete(roomId);
      return;
    }

    // Host left -> oldest remaining member becomes host
    if (room.hostId === socket.id) {
      room.hostId = room.members.keys().next().value;
    }

    broadcastRoom(roomId);
  };

  // Returns the room the socket is in (never trusts a roomId from the client)
  const getRoom = (socket) => {
    const roomId = socket.data.roomId;
    return roomId ? { roomId, room: rooms.get(roomId) } : {};
  };

  io.on("connection", (socket) => {
    // --------------------------------------------------
    // JOIN  (first person in a room becomes the host)
    // --------------------------------------------------
    socket.on("join-room", ({ roomId, videoId, name } = {}) => {
      if (!isValidRoomId(roomId)) return;

      // Already in a room? leave it first
      if (socket.data.roomId) removeFromRoom(socket);

      let room = rooms.get(roomId);

      if (!room) {
        room = {
          hostId: socket.id,
          videoId: typeof videoId === "string" ? videoId : null,
          members: new Map(),
          state: { playing: false, time: 0, at: Date.now() },
        };
        rooms.set(roomId, room);
      }

      if (room.members.size >= MAX_PARTICIPANTS) {
        socket.emit("room-full");
        return;
      }

      room.members.set(socket.id, {
        name: cleanName(name),
        muted: false,
        cameraOff: false,
        lastChatAt: 0,
      });

      socket.join(roomId);
      socket.data.roomId = roomId;

      // Late joiner: give them the current playback position
      socket.emit("watch-party-state", {
        playing: room.state.playing,
        currentTime: currentPlaybackTime(room.state),
      });

      // Existing members will create WebRTC offers to the newcomer
      socket.to(roomId).emit("participant-joined", { socketId: socket.id });

      broadcastRoom(roomId);
    });

    // --------------------------------------------------
    // WEBRTC SIGNALING (only between members of the same room)
    // --------------------------------------------------
    const relay = (event, payloadKey) => {
      socket.on(event, ({ target, [payloadKey]: payload } = {}) => {
        if (typeof target !== "string") return;
        const targetSocket = io.sockets.sockets.get(target);
        if (
          !targetSocket ||
          !socket.data.roomId ||
          targetSocket.data.roomId !== socket.data.roomId
        ) {
          return;
        }
        targetSocket.emit(event, { sender: socket.id, [payloadKey]: payload });
      });
    };

    relay("webrtc-offer", "offer");
    relay("webrtc-answer", "answer");
    relay("webrtc-ice-candidate", "candidate");

    // --------------------------------------------------
    // PLAYBACK SYNC
    // --------------------------------------------------
    const handlePlayback = (event, playing) => {
      socket.on(event, ({ currentTime } = {}) => {
        const { roomId, room } = getRoom(socket);
        if (!room || !isNumber(currentTime)) return;

        room.state = { playing, time: currentTime, at: Date.now() };
        socket.to(roomId).emit(event, { currentTime });
      });
    };

    handlePlayback("watch-party-play", true);
    handlePlayback("watch-party-pause", false);

    socket.on("watch-party-seek", ({ currentTime } = {}) => {
      const { roomId, room } = getRoom(socket);
      if (!room || !isNumber(currentTime)) return;

      room.state = { ...room.state, time: currentTime, at: Date.now() };
      socket.to(roomId).emit("watch-party-seek", { currentTime });
    });

    // Host heartbeat every few seconds to correct drift
    socket.on("watch-party-sync", ({ currentTime, playing } = {}) => {
      const { roomId, room } = getRoom(socket);
      if (!room || room.hostId !== socket.id || !isNumber(currentTime)) return;

      room.state = { playing: Boolean(playing), time: currentTime, at: Date.now() };
      socket.to(roomId).emit("watch-party-sync", {
        currentTime,
        playing: Boolean(playing),
      });
    });

    // --------------------------------------------------
    // CHAT  (sent to everyone INCLUDING the sender)
    // --------------------------------------------------
    socket.on("watch-party-chat", ({ message } = {}) => {
      const { roomId, room } = getRoom(socket);
      const member = room?.members.get(socket.id);
      if (!member || typeof message !== "string") return;

      const text = message.trim().slice(0, MAX_CHAT_LENGTH);
      if (!text) return;

      // simple flood control: 1 message per 300ms
      const now = Date.now();
      if (now - member.lastChatAt < 300) return;
      member.lastChatAt = now;

      io.to(roomId).emit("watch-party-chat", {
        sender: socket.id,
        name: member.name,
        message: text,
        at: now,
      });
    });

    // --------------------------------------------------
    // MIC / CAMERA STATUS (shown in participant list)
    // --------------------------------------------------
    socket.on("media-state", ({ muted, cameraOff } = {}) => {
      const { roomId, room } = getRoom(socket);
      const member = room?.members.get(socket.id);
      if (!member) return;

      member.muted = Boolean(muted);
      member.cameraOff = Boolean(cameraOff);
      broadcastRoom(roomId);
    });

    // --------------------------------------------------
    // LEAVE / DISCONNECT
    // --------------------------------------------------
    socket.on("leave-room", () => removeFromRoom(socket));
    socket.on("disconnect", () => removeFromRoom(socket));
  });
}