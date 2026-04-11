const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const { getTopicById } = require("../controllers/topicController");

router.get("/:id", auth, getTopicById);

module.exports = router;
