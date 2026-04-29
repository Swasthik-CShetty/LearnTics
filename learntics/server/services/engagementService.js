const AuditLog = require("../models/AuditLog");
const Notification = require("../models/Notification");

const createNotification = async ({ userId, type, title, message, link = "", metadata = {} }) => {
  if (!userId) return null;

  return Notification.create({
    userId,
    type,
    title,
    message,
    link,
    metadata,
  });
};

const createAuditLog = async ({ actorUserId, action, entityType, entityId, summary, metadata = {} }) => {
  if (!actorUserId || !entityId) return null;

  return AuditLog.create({
    actorUserId,
    action,
    entityType,
    entityId,
    summary,
    metadata,
  });
};

module.exports = {
  createNotification,
  createAuditLog,
};
