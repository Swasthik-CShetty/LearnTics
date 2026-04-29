require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const ensureAdminUser = require("./config/bootstrapAdmin");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/reels", require("./routes/reelRoutes"));
app.use("/api/topic", require("./routes/topicRoutes"));
app.use("/api/comment", require("./routes/commentRoutes"));
app.use("/api/like", require("./routes/likeRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/progress", require("./routes/progressRoutes"));
app.use("/api/saved-topics", require("./routes/savedTopicRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  const message =
    process.env.NODE_ENV === "development" ? err.message || "Internal server error" : "Internal server error";
  res.status(500).json({ message });
});

const startServer = async () => {
  try {
    await connectDB();
    await ensureAdminUser();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server", error);
    process.exit(1);
  }
};

startServer();
