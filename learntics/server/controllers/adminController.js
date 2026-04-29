const mongoose = require("mongoose");
const User = require("../models/User");
const Comment = require("../models/Comment");
const AuditLog = require("../models/AuditLog");
const { sendTeacherVerificationEmail } = require("../config/mailer");
const { createAuditLog } = require("../services/engagementService");

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

    await createAuditLog({
      actorUserId: req.user.id,
      action: verified ? "teacher_verified" : "teacher_unverified",
      entityType: "User",
      entityId: teacher._id,
      summary: `${teacher.name} was ${verified ? "verified" : "unverified"} as a teacher`,
      metadata: { emailSent: email?.sent || false },
    });

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

exports.listAuditLogs = async (_req, res) => {
  try {
    const logs = await AuditLog.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("actorUserId", "name email role")
      .lean();

    return res.json(logs);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch audit logs" });
  }
};

exports.listReportedComments = async (_req, res) => {
  try {
    const comments = await Comment.find({ status: "reported" })
      .sort({ reportCount: -1, createdAt: -1 })
      .populate("userId", "name email role")
      .populate("reelId", "title topicId")
      .lean();

    return res.json(comments);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch reported comments" });
  }
};

exports.moderateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid comment id" });
    }

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    if (action === "hide") {
      comment.status = "hidden";
    } else if (action === "restore") {
      comment.status = "active";
      comment.reportedBy = [];
      comment.reportCount = 0;
    } else {
      return res.status(400).json({ message: "Unsupported moderation action" });
    }

    await comment.save();

    await createAuditLog({
      actorUserId: req.user.id,
      action: `comment_${action}`,
      entityType: "Comment",
      entityId: comment._id,
      summary: `Comment moderation action: ${action}`,
      metadata: { reportCount: comment.reportCount },
    });

    return res.json({ message: `Comment ${action}d successfully`, comment });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to moderate comment" });
  }
};
