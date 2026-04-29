const mongoose = require("mongoose");

const reelSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    videoUrl: { type: String, required: true },
    videoPublicId: { type: String, default: "" },
    thumbnail: { type: String, default: "" },
    topicId: { type: mongoose.Schema.Types.ObjectId, ref: "Topic", required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Reel", reelSchema);
