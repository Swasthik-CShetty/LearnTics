const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const { register, login, getMe, adminLogin } = require("../controllers/authController");

router.post("/register", register);
router.post("/login", login);
router.post("/admin/login", adminLogin);
router.get("/me", auth, getMe);

module.exports = router;
