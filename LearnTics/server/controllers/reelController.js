const mongoose = require("mongoose");
const Reel = require("../models/Reel");
const Topic = require("../models/Topic");
const Like = require("../models/Like");
const Comment = require("../models/Comment");

exports.uploadReel = async (req, res) => {
  try {
    const { title, topicTitle, description, notes, pdfUrl, thumbnail } = req.body;

    if (!title || !topicTitle) {
      return res.status(400).json({ message: "title and topicTitle are required" });
    }

    if (!req.file || !req.file.path) {
      return res.status(400).json({ message: "Video file is required" });
    }

    const topic = await Topic.create({
      title: topicTitle,
      description: description || "",
      notes: notes || "",
      pdfUrl: pdfUrl || "",
      teacherId: req.user.id,
    });

    const reel = await Reel.create({
      title,
      videoUrl: req.file.path,
      videoPublicId: req.file.filename || "",
      thumbnail: thumbnail || "",
      topicId: topic._id,
      teacherId: req.user.id,
    });

    return res.status(201).json({ message: "Uploaded successfully", reel, topic });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to upload reel" });
  }
};

exports.getReels = async (req, res) => {
  try {
    const reels = await Reel.find()
      .sort({ createdAt: -1 })
      .populate("teacherId", "name role")
      .populate("topicId", "title")
      .lean();

    const reelIds = reels.map((r) => r._id);

    const likeCounts = await Like.aggregate([
      { $match: { reelId: { $in: reelIds } } },
      { $group: { _id: "$reelId", count: { $sum: 1 } } },
    ]);

    const likeMap = new Map(likeCounts.map((l) => [String(l._id), l.count]));

    let myLikes = new Set();
    if (req.user?.id) {
      const liked = await Like.find({ userId: req.user.id, reelId: { $in: reelIds } }).select("reelId");
      myLikes = new Set(liked.map((x) => String(x.reelId)));
    }

    const enriched = reels.map((reel) => ({
      ...reel,
      likesCount: likeMap.get(String(reel._id)) || 0,
      likedByMe: myLikes.has(String(reel._id)),
    }));

    return res.json(enriched);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch reels" });
  }
};

exports.getMyReels = async (req, res) => {
  try {
    const reels = await Reel.find({ teacherId: req.user.id })
      .sort({ createdAt: -1 })
      .populate("topicId", "title description notes pdfUrl")
      .lean();

    return res.json(reels);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch your reels" });
  }
};

exports.updateMyReel = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, thumbnail, topicTitle, description, notes, pdfUrl } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid reel id" });
    }

    const reel = await Reel.findOne({ _id: id, teacherId: req.user.id });
    if (!reel) {
      return res.status(404).json({ message: "Reel not found" });
    }

    if (typeof title === "string") {
      const nextTitle = title.trim();
      if (!nextTitle) {
        return res.status(400).json({ message: "Reel title cannot be empty" });
      }
      reel.title = nextTitle;
    }
    if (typeof thumbnail === "string") reel.thumbnail = thumbnail.trim();
    await reel.save();

    const topic = await Topic.findOne({ _id: reel.topicId, teacherId: req.user.id });
    if (topic) {
      if (typeof topicTitle === "string") {
        const nextTopicTitle = topicTitle.trim();
        if (!nextTopicTitle) {
          return res.status(400).json({ message: "Topic title cannot be empty" });
        }
        topic.title = nextTopicTitle;
      }
      if (typeof description === "string") topic.description = description;
      if (typeof notes === "string") topic.notes = notes;
      if (typeof pdfUrl === "string") topic.pdfUrl = pdfUrl.trim();
      await topic.save();
    }

    const refreshed = await Reel.findById(reel._id).populate("topicId", "title description notes pdfUrl").lean();

    return res.json({
      message: "Content updated successfully",
      reel: refreshed,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to update reel" });
  }
};

exports.deleteMyReel = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid reel id" });
    }

    const reel = await Reel.findOne({ _id: id, teacherId: req.user.id }).lean();
    if (!reel) {
      return res.status(404).json({ message: "Reel not found" });
    }

    await Reel.deleteOne({ _id: reel._id });
    await Like.deleteMany({ reelId: reel._id });
    await Comment.deleteMany({ reelId: reel._id });

    const remainingInTopic = await Reel.countDocuments({ topicId: reel.topicId, teacherId: req.user.id });
    if (remainingInTopic === 0) {
      await Topic.deleteOne({ _id: reel.topicId, teacherId: req.user.id });
    }

    return res.json({ message: "Content deleted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to delete reel" });
  }
};
