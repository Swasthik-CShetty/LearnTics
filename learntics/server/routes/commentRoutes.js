const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const {
  postComment,
  getCommentsByReel,
  getTeacherComments,
  updateComment,
  deleteComment,
  togglePinComment,
  reportComment,
} = require("../controllers/commentController");

router.post("/", auth, postComment);
router.get("/teacher", auth, requireRole("teacher"), getTeacherComments);
router.patch("/:id", auth, updateComment);
router.delete("/:id", auth, deleteComment);
router.patch("/:id/pin", auth, togglePinComment);
router.post("/:id/report", auth, reportComment);
router.get("/:reelId", auth, getCommentsByReel);

module.exports = router;
