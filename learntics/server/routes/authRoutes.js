const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const rateLimit = require("../middleware/rateLimit");
const {
  register,
  login,
  getMe,
  updateMe,
  adminLogin,
  verifyEmail,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");

router.post("/register", rateLimit({ key: "register", max: 8, windowMs: 15 * 60 * 1000 }), register);
router.post("/login", rateLimit({ key: "login", max: 10, windowMs: 15 * 60 * 1000 }), login);
router.post("/admin/login", rateLimit({ key: "admin-login", max: 10, windowMs: 15 * 60 * 1000 }), adminLogin);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", rateLimit({ key: "resend-verification", max: 5, windowMs: 60 * 60 * 1000 }), resendVerificationEmail);
router.post("/forgot-password", rateLimit({ key: "forgot-password", max: 5, windowMs: 60 * 60 * 1000 }), forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/me", auth, getMe);
router.patch("/me", auth, updateMe);

module.exports = router;
