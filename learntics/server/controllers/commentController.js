const mongoose = require("mongoose");
const Comment = require("../models/Comment");
const Reel = require("../models/Reel");
const { createNotification } = require("../services/engagementService");

const COMMENT_POPULATE = { path: "userId", select: "name role avatarUrl" };

const normalizeCommentTree = (comments) => {
  const nodes = comments.map((comment) => ({ ...comment, replies: [] }));
  const map = new Map(nodes.map((comment) => [String(comment._id), comment]));
  const roots = [];

  nodes.forEach((comment) => {
    if (comment.parentCommentId) {
      const parent = map.get(String(comment.parentCommentId));
      if (parent) {
        parent.replies.push(comment);
        return;
      }
    }
    roots.push(comment);
  });

  const sortComments = (items) => {
    items.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    items.forEach((item) => sortComments(item.replies));
  };

  sortComments(roots);
  return roots;
};

const isCommentByUser = (comment, userId) => String(comment.userId?._id || comment.userId) === String(userId);

const getUnansweredTeacherComments = (comments, teacherId) => {
  const commentsById = new Map(comments.map((comment) => [String(comment._id), comment]));
  const answeredStudentCommentIds = new Set();

  comments.forEach((comment) => {
    if (!isCommentByUser(comment, teacherId) || !comment.parentCommentId) return;

    let parent = commentsById.get(String(comment.parentCommentId));
    while (parent) {
      if (!isCommentByUser(parent, teacherId)) {
        answeredStudentCommentIds.add(String(parent._id));
      }
      parent = parent.parentCommentId ? commentsById.get(String(parent.parentCommentId)) : null;
    }
  });

  return comments.filter(
    (comment) => !isCommentByUser(comment, teacherId) && !answeredStudentCommentIds.has(String(comment._id))
  );
};

exports.postComment = async (req, res) => {
  try {
    const { reelId, text, parentCommentId } = req.body;

    if (!reelId || !text) {
      return res.status(400).json({ message: "reelId and text are required" });
    }
    if (!mongoose.Types.ObjectId.isValid(reelId)) {
      return res.status(400).json({ message: "Invalid reel id" });
    }
    if (parentCommentId && !mongoose.Types.ObjectId.isValid(parentCommentId)) {
      return res.status(400).json({ message: "Invalid parent comment id" });
    }

    const reel = await Reel.findById(reelId).select("_id teacherId title topicId").lean();
    if (!reel) {
      return res.status(404).json({ message: "Reel not found" });
    }

    let parentComment = null;
    if (parentCommentId) {
      parentComment = await Comment.findOne({ _id: parentCommentId, reelId }).select("_id userId").lean();
      if (!parentComment) {
        return res.status(404).json({ message: "Parent comment not found" });
      }
    }

    const comment = await Comment.create({
      userId: req.user.id,
      reelId,
      parentCommentId: parentCommentId || null,
      text: text.trim(),
    });

    const populated = await comment.populate(COMMENT_POPULATE);

    const link = `/topic/${reel.topicId}?reel=${reelId}`;
    const recipients = new Set();
    if (String(reel.teacherId) !== String(req.user.id)) recipients.add(String(reel.teacherId));
    if (parentComment && String(parentComment.userId) !== String(req.user.id)) recipients.add(String(parentComment.userId));

    await Promise.all(
      [...recipients].map((userId) =>
        createNotification({
          userId,
          type: parentComment ? "comment_reply" : "new_comment",
          title: parentComment ? "New reply to a comment" : "New comment on your lesson",
          message: parentComment
            ? "Someone replied in a discussion you joined."
            : `A learner commented on ${reel.title}.`,
          link,
          metadata: { reelId, topicId: reel.topicId, commentId: comment._id },
        })
      )
    );

    return res.status(201).json(populated);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to post comment" });
  }
};

exports.getCommentsByReel = async (req, res) => {
  try {
    const { reelId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(reelId)) {
      return res.status(400).json({ message: "Invalid reel id" });
    }

    const comments = await Comment.find({ reelId, status: { $ne: "hidden" } })
      .sort({ isPinned: -1, createdAt: -1 })
      .populate(COMMENT_POPULATE)
      .lean();

    return res.json(normalizeCommentTree(comments));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch comments" });
  }
};

exports.getTeacherComments = async (req, res) => {
  try {
    const reels = await Reel.find({ teacherId: req.user.id }).select("_id title").sort({ createdAt: -1 }).lean();
    if (!reels.length) {
      return res.json([]);
    }

    const reelIds = reels.map((reel) => reel._id);
    const comments = await Comment.find({ reelId: { $in: reelIds }, status: { $ne: "hidden" } })
      .sort({ isPinned: -1, createdAt: -1 })
      .populate(COMMENT_POPULATE)
      .lean();

    const commentsByReelId = new Map();
    comments.forEach((comment) => {
      const key = String(comment.reelId);
      if (!commentsByReelId.has(key)) commentsByReelId.set(key, []);
      commentsByReelId.get(key).push(comment);
    });

    const grouped = reels
      .map((reel) => {
        const visibleComments = commentsByReelId.get(String(reel._id)) || [];
        const unansweredComments = getUnansweredTeacherComments(visibleComments, req.user.id);

        return {
          reelId: reel._id,
          reelTitle: reel.title,
          comments: normalizeCommentTree(unansweredComments),
        };
      })
      .filter((item) => item.comments.length > 0);

    return res.json(grouped);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch teacher comments" });
  }
};

exports.updateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid comment id" });
    }
    if (!text?.trim()) {
      return res.status(400).json({ message: "Comment text is required" });
    }

    const comment = await Comment.findOne({ _id: id, userId: req.user.id });
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    comment.text = text.trim();
    comment.isEdited = true;
    comment.editedAt = new Date();
    await comment.save();

    const populated = await comment.populate(COMMENT_POPULATE);
    return res.json({ message: "Comment updated", comment: populated });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to update comment" });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid comment id" });
    }

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const reel = await Reel.findById(comment.reelId).select("teacherId").lean();
    const canModerate = String(reel?.teacherId) === String(req.user.id) || req.user.role === "admin";
    const canDelete = String(comment.userId) === String(req.user.id) || canModerate;

    if (!canDelete) {
      return res.status(403).json({ message: "You do not have permission to delete this comment" });
    }

    await Comment.deleteMany({ $or: [{ _id: comment._id }, { parentCommentId: comment._id }] });
    return res.json({ message: "Comment deleted" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to delete comment" });
  }
};

exports.togglePinComment = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid comment id" });
    }

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const reel = await Reel.findById(comment.reelId).select("teacherId topicId").lean();
    const canPin = String(reel?.teacherId) === String(req.user.id) || req.user.role === "admin";
    if (!canPin) {
      return res.status(403).json({ message: "Only the teacher or admin can pin comments" });
    }

    comment.isPinned = !comment.isPinned;
    await comment.save();

    return res.json({ message: comment.isPinned ? "Comment pinned" : "Comment unpinned", comment });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to update pin status" });
  }
};

exports.reportComment = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid comment id" });
    }

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const alreadyReported = comment.reportedBy.some((userId) => String(userId) === String(req.user.id));
    if (alreadyReported) {
      return res.status(400).json({ message: "You already reported this comment" });
    }

    comment.reportedBy.push(req.user.id);
    comment.reportCount = comment.reportedBy.length;
    if (comment.reportCount > 0 && comment.status === "active") {
      comment.status = "reported";
    }
    await comment.save();

    const reel = await Reel.findById(comment.reelId).select("teacherId topicId title").lean();
    if (reel && String(reel.teacherId) !== String(req.user.id)) {
      await createNotification({
        userId: reel.teacherId,
        type: "comment_reported",
        title: "A comment was reported",
        message: `A comment on ${reel.title} has been reported for review.`,
        link: `/topic/${reel.topicId}?reel=${reel._id}`,
        metadata: { reelId: reel._id, commentId: comment._id },
      });
    }

    return res.json({ message: "Comment reported for review" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to report comment" });
  }
};
