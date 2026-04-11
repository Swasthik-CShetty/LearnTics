const mongoose = require("mongoose");
const User = require("../models/User");
const { sendTeacherVerificationEmail } = require("../config/mailer");

exports.listTeachers = async (_req, res) => {
  try {
    const teachers = await User.find({ role: "teacher" })
      .select("_id name email isTeacherVerified createdAt")
      .sort({ createdAt: -1 })
      .lean();

    return res.json(teachers);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch teachers" });
  }
};

exports.verifyTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const verified = req.body?.verified !== false;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid teacher id" });
    }

    const teacher = await User.findOne({ _id: id, role: "teacher" }).select(
      "_id name email role isTeacherVerified"
    );

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    const wasVerified = Boolean(teacher.isTeacherVerified);
    teacher.isTeacherVerified = verified;
    await teacher.save();

    let email = null;
    if (verified && !wasVerified) {
      email = await sendTeacherVerificationEmail({
        to: teacher.email,
        name: teacher.name,
      });
    }

    return res.json({
      message: verified ? "Teacher verified" : "Teacher verification removed",
      teacher,
      email,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to update teacher verification" });
  }
};
