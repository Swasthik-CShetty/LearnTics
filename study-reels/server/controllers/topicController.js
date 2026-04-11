const Topic = require("../models/Topic");
const Reel = require("../models/Reel");

exports.getTopicById = async (req, res) => {
  try {
    const { id } = req.params;

    const topic = await Topic.findById(id).populate("teacherId", "name").lean();
    if (!topic) {
      return res.status(404).json({ message: "Topic not found" });
    }

    const reels = await Reel.find({ topicId: id })
      .sort({ createdAt: -1 })
      .select("_id title videoUrl thumbnail createdAt")
      .lean();

    return res.json({ topic, reels });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch topic" });
  }
};
