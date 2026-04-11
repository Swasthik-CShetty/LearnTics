const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const buildToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

const serializeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  isTeacherVerified: Boolean(user.isTeacherVerified),
});

exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

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
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role === "teacher" ? "teacher" : "student",
      isTeacherVerified: role !== "teacher",
    });

    const token = buildToken(user);

    return res.status(201).json({
      message: "Registered successfully",
      token,
      user: serializeUser(user),
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
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = buildToken(user);

    return res.json({
      token,
      user: serializeUser(user),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Could not login" });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("_id name email role isTeacherVerified");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.json({ user: serializeUser(user) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Could not fetch profile" });
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
