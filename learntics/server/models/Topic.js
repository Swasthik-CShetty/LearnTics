const mongoose = require("mongoose");

const topicSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    notes: { type: String, default: "" },
    pdfUrl: { type: String, default: "" },
    coverImage: { type: String, default: "" },
    category: { type: String, default: "" },
    level: { type: String, default: "" },
    estimatedMinutes: { type: Number, default: 0, min: 0 },
    tags: [{ type: String, trim: true }],
    learningObjectives: [{ type: String, trim: true }],
    status: {
      type: String,
      enum: ["draft", "published", "scheduled"],
      default: "published",
    },
    scheduledPublishAt: { type: Date, default: null },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

topicSchema.index({ teacherId: 1, createdAt: -1 });
topicSchema.index({ status: 1, scheduledPublishAt: 1 });

module.exports = mongoose.model("Topic", topicSchema);
