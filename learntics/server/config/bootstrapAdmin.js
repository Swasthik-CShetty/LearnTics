const bcrypt = require("bcrypt");
const User = require("../models/User");

const ensureAdminUser = async () => {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD?.trim();
  const adminName = process.env.ADMIN_NAME?.trim() || "System Admin";

  if (!adminEmail || !adminPassword) {
    console.warn("ADMIN_EMAIL or ADMIN_PASSWORD is missing. Admin bootstrap skipped.");
    return;
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  const existing = await User.findOne({ email: adminEmail });

  if (!existing) {
    await User.create({
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
      role: "admin",
      isTeacherVerified: true,
    });
    console.log(`Admin user created: ${adminEmail}`);
    return;
  }

  existing.name = adminName;
  existing.password = hashedPassword;
  existing.role = "admin";
  existing.isTeacherVerified = true;
  await existing.save();
  console.log(`Admin user synced: ${adminEmail}`);
};

module.exports = ensureAdminUser;
