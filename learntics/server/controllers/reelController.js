const mongoose = require("mongoose");
const Reel = require("../models/Reel");
const Topic = require("../models/Topic");
const Like = require("../models/Like");
const Comment = require("../models/Comment");

const normalizeText = (value) => (typeof value === "string" ? value.trim() : "");

const parseList = (rawValue) => {
  if (!rawValue) return [];
  if (Array.isArray(rawValue)) return rawValue.map(normalizeText).filter(Boolean);
  return String(rawValue)
    .split(/\n|,/)
    .map(normalizeText)
    .filter(Boolean);
};

const parsePublicationSettings = (body = {}) => {
  const status = ["draft", "published", "scheduled"].includes(body.status) ? body.status : "published";
  const scheduledPublishAt =
    status === "scheduled" && body.scheduledPublishAt ? new Date(body.scheduledPublishAt) : null;

  return {
    status,
    scheduledPublishAt:
      scheduledPublishAt && !Number.isNaN(scheduledPublishAt.getTime()) ? scheduledPublishAt : null,
  };
};

const getVisiblePublicationFilter = (user) => {
  if (user?.role === "teacher") return {};
  if (user?.role === "admin") return {};

  return {
    status: "published",
    $or: [{ scheduledPublishAt: null }, { scheduledPublishAt: { $lte: new Date() } }],
  };
};

const findOrCreateTopic = async ({
  teacherId,
  topicTitle,
  description,
  notes,
  pdfUrl,
  coverImage,
  category,
  level,
  estimatedMinutes,
  tags,
  learningObjectives,
  publication,
}) => {
  let topic = await Topic.findOne({ teacherId, title: topicTitle });
  const nextFields = {
    description: description || "",
    notes: notes || "",
    pdfUrl: pdfUrl || "",
    coverImage: coverImage || "",
    category: category || "",
    level: level || "",
    estimatedMinutes: Math.max(0, Number(estimatedMinutes) || 0),
    tags: parseList(tags),
    learningObjectives: parseList(learningObjectives),
    status: publication.status,
    scheduledPublishAt: publication.scheduledPublishAt,
  };

  if (!topic) {
    return Topic.create({
      title: topicTitle,
      teacherId,
      ...nextFields,
    });
  }

  Object.assign(topic, nextFields);
  await topic.save();
  return topic;
};

const parseLessonTitles = (rawValue) => {
  if (!rawValue) return [];

  if (Array.isArray(rawValue)) {
    return rawValue.map((value) => normalizeText(value)).filter(Boolean);
  }

  if (typeof rawValue === "string") {
    try {
      const parsed = JSON.parse(rawValue);
      if (Array.isArray(parsed)) {
        return parsed.map((value) => normalizeText(value)).filter(Boolean);
      }
    } catch (_error) {
      return rawValue
        .split("\n")
        .map((value) => normalizeText(value))
        .filter(Boolean);
    }
  }

  return [];
};

exports.uploadReel = async (req, res) => {
  try {
    const {
      title,
      topicTitle,
      description,
      notes,
      pdfUrl,
      thumbnail,
      coverImage,
      category,
      level,
      estimatedMinutes,
      tags,
      learningObjectives,
      summary,
      durationSeconds,
    } = req.body;

    if (!title || !topicTitle) {
      return res.status(400).json({ message: "title and topicTitle are required" });
    }

    const safeTitle = title.trim();
    const safeTopicTitle = topicTitle.trim();
    if (!safeTitle || !safeTopicTitle) {
      return res.status(400).json({ message: "title and topicTitle cannot be empty" });
    }

    if (!req.file || !req.file.path) {
      return res.status(400).json({ message: "Video file is required" });
    }

    const publication = parsePublicationSettings(req.body);
    const topic = await findOrCreateTopic({
      teacherId: req.user.id,
      topicTitle: safeTopicTitle,
      description,
      notes,
      pdfUrl,
      coverImage,
      category,
      level,
      estimatedMinutes,
      tags,
      learningObjectives,
      publication,
    });

    const lastLesson = await Reel.findOne({ topicId: topic._id }).sort({ lessonOrder: -1 }).select("lessonOrder").lean();

    const reel = await Reel.create({
      title: safeTitle,
      summary: normalizeText(summary),
      lessonOrder: (lastLesson?.lessonOrder || 0) + 1,
      videoUrl: req.file.path,
      videoPublicId: req.file.filename || "",
      thumbnail: thumbnail || "",
      status: publication.status,
      scheduledPublishAt: publication.scheduledPublishAt,
      durationSeconds: Math.max(0, Number(durationSeconds) || 0),
      topicId: topic._id,
      teacherId: req.user.id,
    });

    return res.status(201).json({ message: "Uploaded successfully", reel, topic });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to upload reel" });
  }
};

exports.uploadCourse = async (req, res) => {
  try {
    const {
      topicTitle,
      description,
      notes,
      pdfUrl,
      coverImage,
      thumbnail,
      category,
      level,
      estimatedMinutes,
      tags,
      learningObjectives,
      durationSeconds,
    } = req.body;
    const safeTopicTitle = normalizeText(topicTitle);

    if (!safeTopicTitle) {
      return res.status(400).json({ message: "topicTitle is required" });
    }

    const files = Array.isArray(req.files) ? req.files.filter((file) => file?.path) : [];
    if (!files.length) {
      return res.status(400).json({ message: "At least one lesson video is required" });
    }

    const lessonTitles = parseLessonTitles(req.body.lessonTitles);
    if (lessonTitles.length && lessonTitles.length !== files.length) {
      return res
        .status(400)
        .json({ message: "lessonTitles count must match the number of uploaded lesson videos" });
    }

    const publication = parsePublicationSettings(req.body);
    const topic = await findOrCreateTopic({
      teacherId: req.user.id,
      topicTitle: safeTopicTitle,
      description,
      notes,
      pdfUrl,
      coverImage,
      category,
      level,
      estimatedMinutes,
      tags,
      learningObjectives,
      publication,
    });

    const lastLesson = await Reel.findOne({ topicId: topic._id }).sort({ lessonOrder: -1 }).select("lessonOrder").lean();
    const startOrder = (lastLesson?.lessonOrder || 0) + 1;

    const reels = await Reel.insertMany(
      files.map((file, index) => ({
        title: lessonTitles[index] || `Lesson ${startOrder + index}`,
        lessonOrder: startOrder + index,
        videoUrl: file.path,
        videoPublicId: file.filename || "",
        thumbnail: thumbnail || "",
        status: publication.status,
        scheduledPublishAt: publication.scheduledPublishAt,
        durationSeconds: Math.max(0, Number(durationSeconds) || 0),
        topicId: topic._id,
        teacherId: req.user.id,
      }))
    );

    return res.status(201).json({
      message: "Course playlist uploaded successfully",
      topic,
      reels,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to upload course playlist" });
  }
};

exports.getReels = async (req, res) => {
  try {
    const publicationFilter = getVisiblePublicationFilter(req.user);
    const topicFilter = {};
    if (req.user.role === "student") {
      topicFilter.status = "published";
      topicFilter.$or = [{ scheduledPublishAt: null }, { scheduledPublishAt: { $lte: new Date() } }];
    }

    const visibleTopicIds = await Topic.find(topicFilter).distinct("_id");
    const reels = await Reel.find({ ...publicationFilter, topicId: { $in: visibleTopicIds } })
      .sort({ createdAt: -1 })
      .populate("teacherId", "name role avatarUrl")
      .populate("topicId", "title coverImage level category estimatedMinutes tags")
      .lean();

    if (!reels.length) {
      return res.json([]);
    }

    const reelIds = reels.map((r) => r._id);

    const [likeCounts, commentCounts, liked] = await Promise.all([
      Like.aggregate([{ $match: { reelId: { $in: reelIds } } }, { $group: { _id: "$reelId", count: { $sum: 1 } } }]),
      Comment.aggregate([
        { $match: { reelId: { $in: reelIds }, status: { $ne: "hidden" } } },
        { $group: { _id: "$reelId", count: { $sum: 1 } } },
      ]),
      req.user?.id
        ? Like.find({ userId: req.user.id, reelId: { $in: reelIds } }).select("reelId").lean()
        : [],
    ]);

    const likeMap = new Map(likeCounts.map((l) => [String(l._id), l.count]));
    const commentMap = new Map(commentCounts.map((c) => [String(c._id), c.count]));
    const myLikes = new Set(liked.map((x) => String(x.reelId)));

    const enriched = reels.map((reel) => ({
      ...reel,
      likesCount: likeMap.get(String(reel._id)) || 0,
      commentsCount: commentMap.get(String(reel._id)) || 0,
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
      .sort({ createdAt: -1, lessonOrder: 1 })
      .populate("topicId", "title description notes pdfUrl coverImage category level estimatedMinutes tags learningObjectives status scheduledPublishAt")
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
    const {
      title,
      thumbnail,
      topicTitle,
      description,
      notes,
      pdfUrl,
      coverImage,
      lessonOrder,
      summary,
      category,
      level,
      estimatedMinutes,
      tags,
      learningObjectives,
      status,
      scheduledPublishAt,
      durationSeconds,
    } = req.body;

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
    if (typeof summary === "string") reel.summary = summary.trim();
    if (durationSeconds !== undefined) reel.durationSeconds = Math.max(0, Number(durationSeconds) || 0);
    if (lessonOrder !== undefined) {
      const nextLessonOrder = Number(lessonOrder);
      if (!Number.isInteger(nextLessonOrder) || nextLessonOrder < 1) {
        return res.status(400).json({ message: "Lesson order must be a positive integer" });
      }
      reel.lessonOrder = nextLessonOrder;
    }

    const publication = parsePublicationSettings({ status, scheduledPublishAt });
    reel.status = publication.status;
    reel.scheduledPublishAt = publication.scheduledPublishAt;
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
      if (typeof coverImage === "string") topic.coverImage = coverImage.trim();
      if (typeof category === "string") topic.category = category.trim();
      if (typeof level === "string") topic.level = level.trim();
      if (estimatedMinutes !== undefined) topic.estimatedMinutes = Math.max(0, Number(estimatedMinutes) || 0);
      if (tags !== undefined) topic.tags = parseList(tags);
      if (learningObjectives !== undefined) topic.learningObjectives = parseList(learningObjectives);
      topic.status = publication.status;
      topic.scheduledPublishAt = publication.scheduledPublishAt;
      await topic.save();
    }

    const refreshed = await Reel.findById(reel._id)
      .populate("topicId", "title description notes pdfUrl coverImage category level estimatedMinutes tags learningObjectives status scheduledPublishAt")
      .lean();

    return res.json({
      message: "Content updated successfully",
      reel: refreshed,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to update reel" });
  }
};

exports.reorderMyReels = async (req, res) => {
  try {
    const { topicId, orderedReelIds } = req.body;
    if (!mongoose.Types.ObjectId.isValid(topicId) || !Array.isArray(orderedReelIds) || !orderedReelIds.length) {
      return res.status(400).json({ message: "topicId and orderedReelIds are required" });
    }

    const reels = await Reel.find({ topicId, teacherId: req.user.id }).select("_id");
    const reelIdSet = new Set(reels.map((reel) => String(reel._id)));
    const everyOwned = orderedReelIds.every((id) => reelIdSet.has(String(id)));
    if (!everyOwned) {
      return res.status(400).json({ message: "Ordered ids must belong to your playlist" });
    }

    await Promise.all(
      orderedReelIds.map((reelId, index) =>
        Reel.updateOne({ _id: reelId, teacherId: req.user.id }, { $set: { lessonOrder: index + 1 } })
      )
    );

    return res.json({ message: "Playlist reordered successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to reorder playlist" });
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
