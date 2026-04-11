const Like = require("../models/Like");
const Reel = require("../models/Reel");

exports.toggleLike = async (req, res) => {
  try {
    const { reelId } = req.params;

    const reelExists = await Reel.exists({ _id: reelId });
    if (!reelExists) {
      return res.status(404).json({ message: "Reel not found" });
    }

    const existing = await Like.findOne({ userId: req.user.id, reelId });

    let liked;
    if (existing) {
      await Like.deleteOne({ _id: existing._id });
      liked = false;
    } else {
      await Like.create({ userId: req.user.id, reelId });
      liked = true;
    }

    const likesCount = await Like.countDocuments({ reelId });

    return res.json({ liked, likesCount });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to toggle like" });
  }
};
