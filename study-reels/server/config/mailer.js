const nodemailer = require("nodemailer");

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === "true";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  return transporter;
};

const sendTeacherVerificationEmail = async ({ to, name }) => {
  try {
    const activeTransporter = getTransporter();
    if (!activeTransporter) {
      return { sent: false, reason: "SMTP is not configured" };
    }

    const from = process.env.EMAIL_FROM || process.env.SMTP_USER;
    const platformName = process.env.PLATFORM_NAME || "Study Reels";
    const continueUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/upload`;

    await activeTransporter.sendMail({
      from,
      to,
      subject: "Teacher verification complete",
      text: `Hi ${name || "Teacher"}, your teacher verification is complete. You can continue on ${platformName} and start uploading reels at ${continueUrl}.`,
      html: `<p>Hi ${name || "Teacher"},</p><p>Your teacher verification is complete.</p><p>You can continue on <strong>${platformName}</strong> and start uploading reels.</p><p><a href="${continueUrl}">Continue to Upload</a></p>`,
    });

    return { sent: true };
  } catch (error) {
    console.error("Failed to send verification email", error);
    return { sent: false, reason: "Email delivery failed" };
  }
};

module.exports = { sendTeacherVerificationEmail };
