const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const { toggleSavedTopic, getSavedTopics } = require("../controllers/savedTopicController");

router.get("/", auth, requireRole("student"), getSavedTopics);
router.post("/:topicId/toggle", auth, requireRole("student"), toggleSavedTopic);

module.exports = router;
