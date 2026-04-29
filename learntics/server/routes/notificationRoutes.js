const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const { getNotifications, markNotificationRead } = require("../controllers/notificationController");

router.get("/", auth, getNotifications);
router.patch("/:id/read", auth, markNotificationRead);

module.exports = router;
