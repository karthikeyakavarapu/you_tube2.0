import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import fs from "fs";
import os from "os";
import userroutes from "./routes/auth.js";
import videoroutes from "./routes/video.js";
import likeroutes from "./routes/like.js";
import watchlaterroutes from "./routes/watchlater.js";
import historyrroutes from "./routes/history.js";
import commentroutes from "./routes/comment.js";
import paymentroutes from "./routes/payment.js";
dotenv.config();
const app = express();
import path from "path";
app.use(cors());
app.use(express.json({ limit: "30mb", extended: true }));
app.use(express.urlencoded({ limit: "30mb", extended: true }));
app.get("/uploads/:filename", (req, res) => {
  const filename = req.params.filename;
  const localPath = path.join("uploads", filename);
  if (fs.existsSync(localPath)) {
    return res.sendFile(path.resolve(localPath));
  }

  const tmpPath = path.join(os.tmpdir(), filename);
  if (fs.existsSync(tmpPath)) {
    return res.sendFile(path.resolve(tmpPath));
  }

  return res.redirect("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4");
});
app.get("/", (req, res) => {
  res.send("You tube backend is working");
});
app.get("/test-db", async (req, res) => {
  try {
    const state = mongoose.connection.readyState;
    const states = ["disconnected", "connected", "connecting", "disconnecting"];
    return res.status(200).json({
      status: states[state] || "unknown",
      readyState: state,
      hasDbUrl: !!process.env.DB_URL
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Database connection middleware for serverless environment
app.use(async (req, res, next) => {
  if (mongoose.connection.readyState === 1) {
    return next();
  }
  try {
    console.log("Database not connected. ReadyState is:", mongoose.connection.readyState, "Connecting...");
    await mongoose.connect(process.env.DB_URL, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("Database connected successfully in middleware");
    next();
  } catch (error) {
    console.error("Database connection error in middleware:", error);
    res.status(500).json({ message: "Database connection failed", error: error.message });
  }
});

app.use(bodyParser.json());
app.use("/user", userroutes);
app.use("/video", videoroutes);
app.use("/like", likeroutes);
app.use("/watch", watchlaterroutes);
app.use("/history", historyrroutes);
app.use("/comment", commentroutes);
app.use("/payment", paymentroutes);
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`server running on port ${PORT}`);
});

// Also initialize connection at startup
const DBURL = process.env.DB_URL;
mongoose
  .connect(DBURL)
  .then(() => {
    console.log("Mongodb connected at startup");
  })
  .catch((error) => {
    console.log("Startup connection error:", error);
  });

export default app;
