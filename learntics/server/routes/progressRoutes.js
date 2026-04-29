const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const {
  upsertProgress,
  getMyProgress,
  getContinueWatching,
  getTopicCompletion,
  getTeacherAnalytics,
} = require("../controllers/progressController");

router.post("/", auth, requireRole("student"), upsertProgress);
router.get("/me", auth, requireRole("student"), getMyProgress);
router.get("/continue-watching", auth, requireRole("student"), getContinueWatching);
router.get("/topic/:topicId", auth, requireRole("student"), getTopicCompletion);
router.get("/teacher-analytics", auth, requireRole("teacher"), getTeacherAnalytics);

module.exports = router;
