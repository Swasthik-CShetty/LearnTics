const mongoose = require("mongoose");

const savedTopicSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    topicId: { type: mongoose.Schema.Types.ObjectId, ref: "Topic", required: true },
  },
  { timestamps: true }
);

savedTopicSchema.index({ userId: 1, topicId: 1 }, { unique: true });
savedTopicSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("SavedTopic", savedTopicSchema);
