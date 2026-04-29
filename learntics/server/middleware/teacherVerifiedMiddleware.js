const User = require("../models/User");

const requireTeacherVerified = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== "teacher") {
      return next();
    }

    const user = await User.findById(req.user.id).select("_id role isTeacherVerified").lean();
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (!user.isTeacherVerified) {
      return res.status(403).json({ message: "Teacher account is pending admin verification" });
    }

    return next();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Could not verify teacher status" });
  }
};

module.exports = requireTeacherVerified;
