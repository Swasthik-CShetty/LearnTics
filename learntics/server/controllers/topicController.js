const mongoose = require("mongoose");
const Topic = require("../models/Topic");
const Reel = require("../models/Reel");
const Progress = require("../models/Progress");
const SavedTopic = require("../models/SavedTopic");

exports.getTopicById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid topic id" });
    }

    const topic = await Topic.findById(id).populate("teacherId", "name avatarUrl").lean();
    if (!topic) {
      return res.status(404).json({ message: "Topic not found" });
    }

    const isOwner = String(topic.teacherId?._id || topic.teacherId) === String(req.user.id);
    const isPrivileged = req.user.role === "admin" || isOwner;
    const canViewTopic =
      isPrivileged ||
      (topic.status === "published" &&
        (!topic.scheduledPublishAt || new Date(topic.scheduledPublishAt).getTime() <= Date.now()));

    if (!canViewTopic) {
      return res.status(403).json({ message: "This playlist is not published yet" });
    }

    const reelFilter = { topicId: id };
    if (!isPrivileged) {
      reelFilter.status = "published";
      reelFilter.$or = [{ scheduledPublishAt: null }, { scheduledPublishAt: { $lte: new Date() } }];
    }

    const reels = await Reel.find(reelFilter)
      .sort({ lessonOrder: 1, createdAt: 1 })
      .select("_id title summary videoUrl thumbnail lessonOrder createdAt durationSeconds status scheduledPublishAt")
      .lean();

    const [saved, progress] = await Promise.all([
      req.user.role === "student"
        ? SavedTopic.exists({ userId: req.user.id, topicId: id })
        : false,
      req.user.role === "student"
        ? Progress.find({ userId: req.user.id, topicId: id }).select("reelId completed watchedSeconds lastWatchedAt").lean()
        : [],
    ]);

    const progressMap = new Map(progress.map((item) => [String(item.reelId), item]));
    const completedLessons = progress.filter((item) => item.completed).length;
    const totalLessons = reels.length;
    const completionPercent = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;
    const badge = completionPercent === 100 ? "Topic Completed" : completionPercent >= 70 ? "Almost There" : "In Progress";

    return res.json({
      topic: {
        ...topic,
        isSaved: Boolean(saved),
        completion: {
          totalLessons,
          completedLessons,
          percent: completionPercent,
          badge,
        },
      },
      reels: reels.map((reel) => ({
        ...reel,
        progress: progressMap.get(String(reel._id)) || null,
      })),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch topic" });
  }
};
