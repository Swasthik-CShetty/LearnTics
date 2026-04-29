const mongoose = require("mongoose");
const Progress = require("../models/Progress");
const Reel = require("../models/Reel");
const Topic = require("../models/Topic");

exports.upsertProgress = async (req, res) => {
  try {
    const { reelId, watchedSeconds = 0, completed = false } = req.body;
    if (!mongoose.Types.ObjectId.isValid(reelId)) {
      return res.status(400).json({ message: "Invalid reel id" });
    }

    const reel = await Reel.findById(reelId).select("_id topicId title lessonOrder").lean();
    if (!reel) {
      return res.status(404).json({ message: "Reel not found" });
    }

    const update = {
      watchedSeconds: Math.max(0, Number(watchedSeconds) || 0),
      completed: Boolean(completed),
      lastWatchedAt: new Date(),
    };
    if (update.completed) {
      update.completedAt = new Date();
    }

    const progress = await Progress.findOneAndUpdate(
      { userId: req.user.id, reelId },
      {
        $set: {
          topicId: reel.topicId,
          ...update,
        },
      },
      { upsert: true, new: true }
    ).lean();

    return res.json({ message: "Progress saved", progress });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to save progress" });
  }
};

exports.getMyProgress = async (req, res) => {
  try {
    const items = await Progress.find({ userId: req.user.id })
      .sort({ lastWatchedAt: -1 })
      .populate("topicId", "title coverImage level category")
      .populate("reelId", "title lessonOrder thumbnail videoUrl")
      .lean();

    return res.json(items);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch progress" });
  }
};

exports.getContinueWatching = async (req, res) => {
  try {
    const items = await Progress.find({ userId: req.user.id })
      .sort({ lastWatchedAt: -1 })
      .limit(6)
      .populate("topicId", "title coverImage")
      .populate("reelId", "title lessonOrder thumbnail")
      .lean();

    return res.json(items);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch continue watching list" });
  }
};

exports.getTopicCompletion = async (req, res) => {
  try {
    const { topicId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(topicId)) {
      return res.status(400).json({ message: "Invalid topic id" });
    }

    const [reels, progress] = await Promise.all([
      Reel.find({ topicId }).select("_id").lean(),
      Progress.find({ userId: req.user.id, topicId, completed: true }).select("reelId").lean(),
    ]);

    const totalLessons = reels.length;
    const completedLessons = progress.length;
    const percent = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;

    return res.json({
      totalLessons,
      completedLessons,
      percent,
      badge: percent === 100 ? "Topic Completed" : percent >= 70 ? "Almost There" : "In Progress",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch topic completion" });
  }
};

exports.getTeacherAnalytics = async (req, res) => {
  try {
    const teacherTopics = await Topic.find({ teacherId: req.user.id }).select("_id title").lean();
    const teacherReels = await Reel.find({ teacherId: req.user.id }).select("_id topicId status").lean();
    const reelIds = teacherReels.map((reel) => reel._id);

    const progress = await Progress.find({ reelId: { $in: reelIds } }).lean();
    const byTopic = new Map();

    teacherTopics.forEach((topic) => {
      byTopic.set(String(topic._id), {
        topicId: topic._id,
        topicTitle: topic.title,
        watches: 0,
        completedLessons: 0,
      });
    });

    progress.forEach((item) => {
      const bucket = byTopic.get(String(item.topicId));
      if (!bucket) return;
      bucket.watches += 1;
      if (item.completed) bucket.completedLessons += 1;
    });

    return res.json({
      totals: {
        topics: teacherTopics.length,
        reels: teacherReels.length,
        drafts: teacherReels.filter((reel) => reel.status === "draft").length,
        scheduled: teacherReels.filter((reel) => reel.status === "scheduled").length,
        watches: progress.length,
        completedLessons: progress.filter((item) => item.completed).length,
      },
      topics: [...byTopic.values()],
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to load analytics" });
  }
};
