import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/axios";
import { useToast } from "../components/ToastProvider";
import { setAuth, updateStoredUser } from "../utils/auth";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    const verifyToken = searchParams.get("verifyToken");
    if (!verifyToken) return;

    const run = async () => {
      setVerifyLoading(true);
      try {
        const { data } = await api.post("/auth/verify-email", { token: verifyToken });
        updateStoredUser(data.user);
        showToast("Email verified successfully.", "success");
        setSearchParams((prev) => {
          prev.delete("verifyToken");
          return prev;
        });
      } catch (err) {
        showToast(err.response?.data?.message || "Verification failed", "error");
      } finally {
        setVerifyLoading(false);
      }
    };

    run();
  }, [searchParams, setSearchParams, showToast]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", form);
      setShowForgotPassword(false);
      setAuth(data);
      if (data.warnings?.emailVerificationPending) {
        showToast("Email verification is still pending.", "warn");
      }
      if (data.warnings?.teacherVerificationPending) {
        showToast("Teacher account is pending admin verification.", "warn");
      }
      navigate("/dashboard");
    } catch (err) {
      const errorCode = err.response?.data?.code;
      if (errorCode === "INVALID_PASSWORD") {
        setShowForgotPassword(true);
        setForgotEmail(form.email);
      }
      showToast(err.response?.data?.message || "Login failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const requestReset = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      await api.post("/auth/forgot-password", { email: forgotEmail });
      showToast("Password reset instructions have been prepared.", "success");
      setForgotEmail("");
    } catch (err) {
      showToast(err.response?.data?.message || "Could not start password reset", "error");
    } finally {
      setForgotLoading(false);
    }
  };

  const completeReset = async (e) => {
    e.preventDefault();
    const resetToken = searchParams.get("resetToken");
    if (!resetToken) return;

    setResetLoading(true);
    try {
      await api.post("/auth/reset-password", { token: resetToken, password: resetPassword });
      setResetPassword("");
      setSearchParams((prev) => {
        prev.delete("resetToken");
        return prev;
      });
      setShowForgotPassword(false);
      showToast("Password reset successfully. You can sign in now.", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Password reset failed", "error");
    } finally {
      setResetLoading(false);
    }
  };

  const resendVerification = async () => {
    if (!form.email.trim()) {
      showToast("Enter your email first to resend verification.", "warn");
      return;
    }

    try {
      await api.post("/auth/resend-verification", { email: form.email });
      showToast("Verification email processed.", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Could not resend verification email", "error");
    }
  };

  const hasResetToken = Boolean(searchParams.get("resetToken"));

  return (
    <div className="page auth-page">
      <div className="auth-layout">
        <section className="card auth-showcase-card">
          <div className="auth-showcase-copy">
            <p className="eyebrow">Welcome Back</p>
            <h1>Sign in to your learning workspace</h1>
            <p className="subtle-text hero-text">
              Stay on top of your lessons, saved playlists, teaching tools, and account alerts from one clean place.
            </p>
          </div>

          <div className="auth-showcase-grid">
            <div className="auth-showcase-stat">
              <strong>Focused feed</strong>
              <span>Return to lessons in progress without digging through the app.</span>
            </div>
            <div className="auth-showcase-stat">
              <strong>Saved playlists</strong>
              <span>Keep high-value topics close for revision and faster study sessions.</span>
            </div>
            <div className="auth-showcase-stat">
              <strong>Teacher controls</strong>
              <span>Upload, schedule, and manage discussion threads with less friction.</span>
            </div>
            <div className="auth-showcase-stat">
              <strong>Account trust</strong>
              <span>Monitor verification and stay current on important notifications.</span>
            </div>
          </div>
        </section>

        <div className="auth-side-column">
          <form className="card form-card auth-primary-card" onSubmit={submit}>
            <p className="eyebrow">Account Access</p>
            <h2>Login</h2>
            <p className="subtle-text">Use your LearnTics email and password to continue.</p>
            {verifyLoading && <div className="notice notice-warn">Verifying your email...</div>}

            <label className="field-label">
              Email
              <input
                required
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>

            <label className="field-label">
              Password
              <input
                required
                type="password"
                placeholder="Enter your password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </label>

            <button className="btn" disabled={loading}>
              {loading ? "Signing in..." : "Login"}
            </button>

            <div className="auth-inline-actions">
              <button className="btn ghost" type="button" onClick={resendVerification}>
                Resend verification email
              </button>
              <p className="auth-inline-copy">
                New here? <Link to="/register">Create account</Link>
              </p>
            </div>
          </form>

          {showForgotPassword && !hasResetToken && (
            <form className="card form-card compact-form auth-support-card" onSubmit={requestReset}>
              <p className="eyebrow">Need Help?</p>
              <h3>Forgot your password?</h3>
              <p className="subtle-text">
                Your last sign-in attempt looked like a password mismatch. We can send a reset link to your email.
              </p>
              <label className="field-label">
                Email
                <input
                  required
                  type="email"
                  placeholder="Your account email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                />
              </label>
              <button className="btn ghost" disabled={forgotLoading}>
                {forgotLoading ? "Preparing..." : "Send reset link"}
              </button>
            </form>
          )}

          {hasResetToken && (
            <form className="card form-card compact-form auth-support-card" onSubmit={completeReset}>
              <p className="eyebrow">Reset Password</p>
              <h3>Choose a new password</h3>
              <p className="subtle-text">Set a fresh password for your account, then sign in again.</p>
              <label className="field-label">
                New password
                <input
                  required
                  minLength={6}
                  type="password"
                  placeholder="At least 6 characters"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                />
              </label>
              <button className="btn" disabled={resetLoading}>
                {resetLoading ? "Resetting..." : "Reset password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
