const router = require("express").Router();
const upload = require("../middleware/upload");
const auth = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const requireTeacherVerified = require("../middleware/teacherVerifiedMiddleware");
const { uploadReel, getReels, getMyReels, updateMyReel, deleteMyReel } = require("../controllers/reelController");

router.get("/", auth, getReels);
router.get("/my", auth, requireRole("teacher"), getMyReels);
router.patch("/:id", auth, requireRole("teacher"), updateMyReel);
router.delete("/:id", auth, requireRole("teacher"), deleteMyReel);
const uploadVideo = upload.single("video");

router.post(
  "/upload",
  auth,
  requireRole("teacher"),
  requireTeacherVerified,
  (req, res, next) => {
    uploadVideo(req, res, (err) => {
      if (err) {
        return res.status(400).json({ message: err.message || "Upload failed" });
      }
      return next();
    });
  },
  uploadReel
);

module.exports = router;
