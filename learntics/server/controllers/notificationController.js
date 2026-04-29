const Notification = require("../models/Notification");

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(20).lean();
    return res.json(notifications);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch notifications" });
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: { readAt: new Date() } },
      { new: true }
    ).lean();

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    return res.json({ message: "Notification marked as read", notification });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to update notification" });
  }
};
