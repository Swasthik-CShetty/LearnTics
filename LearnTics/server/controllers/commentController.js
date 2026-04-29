const Comment = require("../models/Comment");
const Reel = require("../models/Reel");

exports.postComment = async (req, res) => {
  try {
    const { reelId, text } = req.body;

    if (!reelId || !text) {
      return res.status(400).json({ message: "reelId and text are required" });
    }

    const reelExists = await Reel.exists({ _id: reelId });
    if (!reelExists) {
      return res.status(404).json({ message: "Reel not found" });
    }

    const comment = await Comment.create({
      userId: req.user.id,
      reelId,
      text,
    });

    const populated = await comment.populate("userId", "name role");

    return res.status(201).json(populated);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to post comment" });
  }
};

exports.getCommentsByReel = async (req, res) => {
  try {
    const { reelId } = req.params;

    const comments = await Comment.find({ reelId })
      .sort({ createdAt: -1 })
      .populate("userId", "name role")
      .lean();

    return res.json(comments);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch comments" });
  }
};
