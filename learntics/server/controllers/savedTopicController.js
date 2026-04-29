const mongoose = require("mongoose");
const SavedTopic = require("../models/SavedTopic");
const Topic = require("../models/Topic");

exports.toggleSavedTopic = async (req, res) => {
  try {
    const { topicId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(topicId)) {
      return res.status(400).json({ message: "Invalid topic id" });
    }

    const topic = await Topic.findById(topicId).select("_id");
    if (!topic) {
      return res.status(404).json({ message: "Topic not found" });
    }

    const existing = await SavedTopic.findOne({ userId: req.user.id, topicId });
    if (existing) {
      await existing.deleteOne();
      return res.json({ saved: false, message: "Playlist removed from saved list" });
    }

    await SavedTopic.create({ userId: req.user.id, topicId });
    return res.json({ saved: true, message: "Playlist saved" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to update saved playlist" });
  }
};

exports.getSavedTopics = async (req, res) => {
  try {
    const items = await SavedTopic.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .populate({
        path: "topicId",
        select: "title description coverImage level category estimatedMinutes tags teacherId",
        populate: { path: "teacherId", select: "name avatarUrl" },
      })
      .lean();

    return res.json(items);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch saved playlists" });
  }
};
