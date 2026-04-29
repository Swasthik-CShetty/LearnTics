const mongoose = require("mongoose");

const reelSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    lessonOrder: { type: Number, default: 1, min: 1 },
    videoUrl: { type: String, required: true },
    videoPublicId: { type: String, default: "" },
    thumbnail: { type: String, default: "" },
    summary: { type: String, default: "" },
    status: {
      type: String,
      enum: ["draft", "published", "scheduled"],
      default: "published",
    },
    scheduledPublishAt: { type: Date, default: null },
    durationSeconds: { type: Number, default: 0, min: 0 },
    topicId: { type: mongoose.Schema.Types.ObjectId, ref: "Topic", required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

reelSchema.index({ topicId: 1, lessonOrder: 1 });
reelSchema.index({ teacherId: 1, createdAt: -1 });
reelSchema.index({ status: 1, scheduledPublishAt: 1 });

module.exports = mongoose.model("Reel", reelSchema);
