const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const { postComment, getCommentsByReel } = require("../controllers/commentController");

router.post("/", auth, postComment);
router.get("/:reelId", auth, getCommentsByReel);

module.exports = router;
