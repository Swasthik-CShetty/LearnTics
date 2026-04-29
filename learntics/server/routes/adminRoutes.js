const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const {
  listTeachers,
  verifyTeacher,
  listAuditLogs,
  listReportedComments,
  moderateComment,
} = require("../controllers/adminController");

router.get("/teachers", auth, requireRole("admin"), listTeachers);
router.patch("/teachers/:id/verify", auth, requireRole("admin"), verifyTeacher);
router.get("/audit-logs", auth, requireRole("admin"), listAuditLogs);
router.get("/reported-comments", auth, requireRole("admin"), listReportedComments);
router.patch("/comments/:id/moderate", auth, requireRole("admin"), moderateComment);

module.exports = router;
