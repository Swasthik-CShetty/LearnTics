const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const { listTeachers, verifyTeacher } = require("../controllers/adminController");

router.get("/teachers", auth, requireRole("admin"), listTeachers);
router.patch("/teachers/:id/verify", auth, requireRole("admin"), verifyTeacher);

module.exports = router;
