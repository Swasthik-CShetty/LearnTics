const mongoose = require("mongoose");

const progressSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    topicId: { type: mongoose.Schema.Types.ObjectId, ref: "Topic", required: true },
    reelId: { type: mongoose.Schema.Types.ObjectId, ref: "Reel", required: true },
    watchedSeconds: { type: Number, default: 0, min: 0 },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
    lastWatchedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

progressSchema.index({ userId: 1, reelId: 1 }, { unique: true });
progressSchema.index({ userId: 1, lastWatchedAt: -1 });
progressSchema.index({ topicId: 1, userId: 1 });

module.exports = mongoose.model("Progress", progressSchema);
