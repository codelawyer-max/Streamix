import "dotenv/config";

import express, { urlencoded } from "express";
import cors from "cors";
import mongoose from "mongoose";
import path from "path";

import "./modals/video.js";

import userroutes from "./routes/auth.js";
import videoroutes from "./routes/video.js";
import likeroutes from "./routes/like.js";
import watchlaterroutes from "./routes/watchlater.js";
import historyRoutes from "./routes/history.js";
import commentRoutes from "./routes/comment.js";
import otpRoutes from "./routes/otp.js";
import subscriptionRoutes from "./routes/subscription.js";


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

app.use(
  "/otp",
  otpRoutes
);

app.use(
  "/subscription",
  subscriptionRoutes
);



const PORT = process.env.PORT || 5000;


app.listen(PORT, () => {

  console.log(
    `server is running on port ${PORT}`
  );

});



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

