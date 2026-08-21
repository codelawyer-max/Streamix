import "dotenv/config";

import express, { urlencoded } from "express";
import cors from "cors";
import mongoose from "mongoose";
import path from "path";
import { Server } from "socket.io";

import "./modals/video.js";

import userroutes from "./routes/auth.js";
import videoroutes from "./routes/video.js";
import likeroutes from "./routes/like.js";
import watchlaterroutes from "./routes/watchlater.js";
import historyRoutes from "./routes/history.js";
import commentRoutes from "./routes/comment.js";
import otpRoutes from "./routes/otp.js";
import subscriptionRoutes from "./routes/subscription.js";
import downloadRoutes from "./routes/download.js";

console.log("Mongo URI:", process.env.DB_URL);

const app = express();

app.use(cors());

app.use(express.json({ limit: "30mb" }));

app.use(
  urlencoded({
    extended: true,
    limit: "30mb",
  })
);

app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "uploads"))
);

app.get("/", (req, res) => {
  res.send("youtube backend server is running");
});

app.use("/user", userroutes);

app.use("/video", videoroutes);

app.use("/like", likeroutes);

app.use("/watch", watchlaterroutes);

app.use("/history", historyRoutes);

app.use("/comment", commentRoutes);

app.use("/otp", otpRoutes);

app.use("/subscription", subscriptionRoutes);

app.use("/download", downloadRoutes);

const PORT = process.env.PORT || 5000;

const httpServer = app.listen(PORT, () => {
  console.log(`server is running on port ${PORT}`);
});

const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // ==========================================
  // CREATE WATCH PARTY ROOM
  // ==========================================

  socket.on("create-room", (roomId) => {
    socket.join(roomId);

    // Store the room on the socket
    socket.data.roomId = roomId;

    console.log(
      `Socket ${socket.id} created room ${roomId}`
    );

    socket.emit("room-created", {
      roomId,
    });
  });

  // ==========================================
  // JOIN WATCH PARTY ROOM
  // ==========================================

  socket.on("join-room", async (roomId) => {
    try {
      // Get participants already inside the room
      const existingSockets =
        await io.in(roomId).fetchSockets();

      // Join the new participant
      socket.join(roomId);

      // Store the room on the socket
      socket.data.roomId = roomId;

      console.log(
        `Socket ${socket.id} joined room ${roomId}`
      );

      // Send existing participants to the new participant
      socket.emit("existing-participants", {
        participants: existingSockets
          .map((existingSocket) => existingSocket.id)
          .filter((id) => id !== socket.id),
      });

      // Tell existing participants about the new participant
      socket.to(roomId).emit("participant-joined", {
        socketId: socket.id,
      });

    } catch (error) {
      console.error("Join room error:", error);
    }
  });

  // ==========================================
  // WEBRTC OFFER
  // ==========================================

  socket.on("webrtc-offer", ({ target, offer }) => {
    console.log(
      `WebRTC offer: ${socket.id} -> ${target}`
    );

    io.to(target).emit("webrtc-offer", {
      sender: socket.id,
      offer,
    });
  });


  // ==========================================
  // WEBRTC ANSWER
  // ==========================================

  socket.on("webrtc-answer", ({ target, answer }) => {
    console.log(
      `WebRTC answer: ${socket.id} -> ${target}`
    );

    io.to(target).emit("webrtc-answer", {
      sender: socket.id,
      answer,
    });
  });


  // ==========================================
  // WEBRTC ICE CANDIDATE
  // ==========================================

  socket.on(
    "webrtc-ice-candidate",
    ({ target, candidate }) => {
      console.log(
        `ICE candidate: ${socket.id} -> ${target}`
      );

      io.to(target).emit(
        "webrtc-ice-candidate",
        {
          sender: socket.id,
          candidate,
        }
      );
    }
  );


  socket.on("watch-party-play", ({ roomId, currentTime }) => {
    socket.to(roomId).emit("watch-party-play", {
      currentTime,
    });
  });

  socket.on("watch-party-pause", ({ roomId, currentTime }) => {
    socket.to(roomId).emit("watch-party-pause", {
      currentTime,
    });
  });

  socket.on("watch-party-seek", ({ roomId, currentTime }) => {
    socket.to(roomId).emit("watch-party-seek", {
      currentTime,
    });
  });


  socket.on("watch-party-chat", ({ roomId, message }) => {
    socket.to(roomId).emit("watch-party-chat", {
      sender: socket.id,
      message,
    });
  });

  // ==========================================
  // LEAVE WATCH PARTY ROOM
  // ==========================================

  socket.on("leave-room", (roomId) => {
    socket.leave(roomId);

    console.log(
      `Socket ${socket.id} left room ${roomId}`
    );

    socket.to(roomId).emit("participant-left", {
      socketId: socket.id,
    });

    // Clear stored room
    socket.data.roomId = null;
  });

  // ==========================================
  // DISCONNECT
  // ==========================================

  socket.on("disconnect", () => {
    const roomId = socket.data.roomId;

    // Notify other participants if the user
    // disconnects without explicitly leaving
    if (roomId) {
      socket.to(roomId).emit("participant-left", {
        socketId: socket.id,
      });
    }

    console.log(
      "Socket disconnected:",
      socket.id
    );
  });
});

// ==========================================
// MONGODB CONNECTION
// ==========================================

mongoose
  .connect(process.env.DB_URL)

  .then(() => {
    console.log("MongoDB connected");

    console.log(
      "DATABASE NAME:",
      mongoose.connection.name
    );
  })

  .catch((error) => {
    console.log(
      "MongoDB connection error:",
      error
    );
  });

