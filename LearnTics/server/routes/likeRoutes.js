const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const { toggleLike } = require("../controllers/likeController");

router.post("/:reelId", auth, toggleLike);

module.exports = router;
