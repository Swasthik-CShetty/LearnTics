const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { sendEmailVerificationEmail, sendPasswordResetEmail } = require("../config/mailer");

const buildToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

const serializeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  avatarUrl: user.avatarUrl || "",
  isTeacherVerified: Boolean(user.isTeacherVerified),
  emailVerified: Boolean(user.emailVerified),
});

const buildRandomToken = () => crypto.randomBytes(24).toString("hex");

const sendVerificationIfPossible = async (user) => {
  const token = buildRandomToken();
  user.emailVerificationToken = token;
  user.emailVerificationExpires = new Date(Date.now() + 1000 * 60 * 60 * 24);
  await user.save();

  return sendEmailVerificationEmail({
    to: user.email,
    name: user.name,
    token,
  });
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, role, avatarUrl } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role === "teacher" ? "teacher" : "student",
      avatarUrl: typeof avatarUrl === "string" ? avatarUrl.trim() : "",
      isTeacherVerified: role !== "teacher",
      emailVerified: false,
    });

    const verificationEmail = await sendVerificationIfPossible(user);
    const token = buildToken(user);

    return res.status(201).json({
      message: "Registered successfully",
      token,
      user: serializeUser(user),
      verificationEmail,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Could not register user" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials", code: "INVALID_CREDENTIALS" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect password", code: "INVALID_PASSWORD" });
    }

    const token = buildToken(user);

    return res.json({
      token,
      user: serializeUser(user),
      warnings: {
        emailVerificationPending: !user.emailVerified,
        teacherVerificationPending: user.role === "teacher" && !user.isTeacherVerified,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Could not login" });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "_id name email role avatarUrl isTeacherVerified emailVerified"
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.json({ user: serializeUser(user) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Could not fetch profile" });
  }
};

exports.updateMe = async (req, res) => {
  try {
    const { name, avatarUrl } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (typeof name === "string") {
      const nextName = name.trim();
      if (!nextName) {
        return res.status(400).json({ message: "Name cannot be empty" });
      }
      user.name = nextName;
    }

    if (typeof avatarUrl === "string") {
      user.avatarUrl = avatarUrl.trim();
    }

    await user.save();

    return res.json({
      message: "Profile updated successfully",
      user: serializeUser(user),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Could not update profile" });
  }
};

exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase(), role: "admin" });
    if (!user) {
      return res.status(400).json({ message: "Invalid admin credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid admin credentials" });
    }

    const token = buildToken(user);
    return res.json({
      token,
      user: serializeUser(user),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Could not login as admin" });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: "Verification token is required" });
    }

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: "Verification token is invalid or expired" });
    }

    user.emailVerified = true;
    user.emailVerificationToken = "";
    user.emailVerificationExpires = null;
    await user.save();

    return res.json({ message: "Email verified successfully", user: serializeUser(user) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Could not verify email" });
  }
};

exports.resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.emailVerified) {
      return res.json({ message: "Email is already verified" });
    }

    const emailResult = await sendVerificationIfPossible(user);
    return res.json({ message: "Verification email processed", email: emailResult });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Could not resend verification email" });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.json({ message: "If that email exists, a reset link has been prepared." });
    }

    const token = buildRandomToken();
    user.passwordResetToken = token;
    user.passwordResetExpires = new Date(Date.now() + 1000 * 60 * 30);
    await user.save();

    const emailResult = await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      token,
    });

    return res.json({
      message: "If that email exists, a reset link has been prepared.",
      email: emailResult,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Could not process password reset" });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: "token and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: "Reset token is invalid or expired" });
    }

    user.password = await bcrypt.hash(password, 10);
    user.passwordResetToken = "";
    user.passwordResetExpires = null;
    await user.save();

    return res.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Could not reset password" });
  }
};
