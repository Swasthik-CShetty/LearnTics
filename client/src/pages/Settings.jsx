import { useEffect, useState } from "react";
import api from "../api/axios";
import SkeletonCard from "../components/SkeletonCard";
import { useToast } from "../components/ToastProvider";
import { getUser, updateStoredUser } from "../utils/auth";

export default function Settings() {
  const initialUser = getUser();
  const [accountEmail, setAccountEmail] = useState(initialUser?.email || "");
  const [form, setForm] = useState({
    name: initialUser?.name || "",
    avatarUrl: initialUser?.avatarUrl || "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState(null);
  const { showToast } = useToast();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [meRes, notificationsRes] = await Promise.all([api.get("/auth/me"), api.get("/notifications")]);
        const user = meRes.data.user;
        setForm({
          name: user.name || "",
          avatarUrl: user.avatarUrl || "",
        });
        setAccountEmail(user.email || "");
        updateStoredUser(user);

        setStats({
          unreadNotifications: notificationsRes.data.filter((item) => !item.readAt).length,
          emailVerified: user.emailVerified,
          teacherVerified: user.isTeacherVerified,
          role: user.role,
        });
      } catch (err) {
        showToast(err.response?.data?.message || "Could not load settings", "error");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.patch("/auth/me", form);
      updateStoredUser(data.user);
      showToast("Profile updated successfully.", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Could not update profile", "error");
    } finally {
      setSaving(false);
    }
  };

  const resendVerification = async () => {
    try {
      if (!accountEmail) return;
      await api.post("/auth/resend-verification", { email: accountEmail });
      showToast("Verification email processed.", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Could not resend verification email", "error");
    }
  };

  if (loading) {
    return (
      <div className="page">
        <SkeletonCard lines={5} />
      </div>
    );
  }

  return (
    <div className="page page-stack settings-layout">
      <section className="card hero-card settings-hero">
        <div className="settings-avatar-wrap">
          {form.avatarUrl ? (
            <img src={form.avatarUrl} alt={form.name} className="settings-avatar" />
          ) : (
            <div className="settings-avatar settings-avatar-fallback">{(form.name || "U").slice(0, 1).toUpperCase()}</div>
          )}
        </div>
        <div className="hero-copy">
          <p className="eyebrow">Profile Studio</p>
          <h1>{form.name || "Your profile"}</h1>
          <p className="subtle-text hero-text">
            Keep your identity polished, monitor account trust signals, and make the product feel like it belongs to you.
          </p>
        </div>
        <div className="hero-stats-grid">
          <div className="hero-stat-card"><span>Role</span><strong>{stats?.role || "-"}</strong></div>
          <div className="hero-stat-card"><span>Unread Alerts</span><strong>{stats?.unreadNotifications || 0}</strong></div>
          <div className="hero-stat-card"><span>Email Verified</span><strong>{stats?.emailVerified ? "Yes" : "No"}</strong></div>
          <div className="hero-stat-card"><span>Teacher Approved</span><strong>{stats?.teacherVerified ? "Yes" : "No"}</strong></div>
        </div>
      </section>

      <section className="settings-grid">
        <div className="settings-main">
          <form className="card settings-card section-card" onSubmit={saveProfile}>
            <div className="section-header">
              <div>
                <p className="eyebrow">Profile</p>
                <h2>Identity and presentation</h2>
              </div>
            </div>
            <input
              placeholder="Full name"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
            <input
              placeholder="Avatar URL"
              value={form.avatarUrl}
              onChange={(e) => setForm((prev) => ({ ...prev, avatarUrl: e.target.value }))}
            />
            <button className="btn" disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </button>
          </form>

          <div className="card settings-card settings-card-wide section-card">
            <div className="section-header">
              <div>
                <p className="eyebrow">Quick Appearance Notes</p>
                <h2>Make your account feel complete</h2>
              </div>
            </div>
            <div className="dashboard-mini-grid">
              <div className="mini-card-link visual-card">
                <div className="tile-accent" />
                <strong>Use a real avatar</strong>
                <span>Even a simple headshot makes comments, teaching pages, and the dashboard feel more alive.</span>
              </div>
              <div className="mini-card-link visual-card">
                <div className="tile-accent" />
                <strong>Keep notifications low-friction</strong>
                <span>A clean account state makes the platform feel professional and trustworthy.</span>
              </div>
            </div>
          </div>
        </div>

        <aside className="settings-sidebar">
          <div className="card settings-card side-panel">
            <div className="section-header">
              <div>
                <p className="eyebrow">Account Status</p>
                <h3>Trust and verification</h3>
              </div>
            </div>
            <div className="side-list">
              <div className="side-list-item">
                <strong>{stats?.emailVerified ? "Email verified" : "Email pending"}</strong>
                <span>{stats?.emailVerified ? "Your account has a stronger trust signal." : "Verify your email for a more complete account."}</span>
              </div>
              <div className="side-list-item">
                <strong>{stats?.teacherVerified ? "Teacher approved" : "Teacher review pending"}</strong>
                <span>Relevant when you upload and publish content as a teacher.</span>
              </div>
            </div>
            {!stats?.emailVerified && (
              <button type="button" className="btn ghost" onClick={resendVerification}>
                Resend verification email
              </button>
            )}
          </div>

          <div className="card settings-card side-panel">
            <div className="section-header">
              <div>
                <p className="eyebrow">Quick Notes</p>
                <h3>Professional touches</h3>
              </div>
            </div>
            <div className="side-list">
              <div className="side-list-item">
                <strong>Clear identity</strong>
                <span>Consistent name and avatar make discussion spaces feel more premium.</span>
              </div>
              <div className="side-list-item">
                <strong>Trusted account</strong>
                <span>Verification states help the product feel safer and more credible.</span>
              </div>
              <div className="side-list-item">
                <strong>Live context</strong>
                <span>Your notification count in the header now gives the app more ongoing presence.</span>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
