import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useToast } from "../components/ToastProvider";
import { setAuth } from "../utils/auth";

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    avatarUrl: "",
    role: "student",
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register", form);
      setAuth(data);
      if (data.user.role === "teacher" && !data.user.isTeacherVerified) {
        showToast("Teacher account created. Wait for admin verification before uploading.", "warn");
      }
      showToast("Account created. Check your email for a verification link.", "success");
      navigate("/dashboard");
    } catch (err) {
      showToast(err.response?.data?.message || "Registration failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page auth-page">
      <div className="auth-layout">
        <form className="card form-card auth-primary-card" onSubmit={submit}>
          <p className="eyebrow">Join LearnTics</p>
          <h1>Create your account</h1>
          <p className="subtle-text">Start as a learner or request teacher access for publishing.</p>
          <label className="field-label">
            Name
            <input required placeholder="Your full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className="field-label">
            Email
            <input required type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label className="field-label">
            Profile avatar URL
            <input placeholder="Optional image link" value={form.avatarUrl} onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })} />
          </label>
          <label className="field-label">
            Password
            <input required minLength={6} type="password" placeholder="At least 6 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </label>
          <label className="field-label">
            Account type
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
            </select>
          </label>
          <button className="btn" disabled={loading}>
            {loading ? "Creating..." : "Register"}
          </button>
          <p>
            Already have account? <Link to="/login">Login</Link>
          </p>
        </form>

        <aside className="auth-side-column">
          <div className="card side-panel auth-info-card">
            <p className="eyebrow">For Students</p>
            <h2>Learn from short playlists</h2>
            <div className="side-list">
              <div className="side-list-item"><strong>Personal feed</strong><span>Discover lessons by topic, teacher, and tags.</span></div>
              <div className="side-list-item"><strong>Saved playlists</strong><span>Keep important courses close for revision.</span></div>
              <div className="side-list-item"><strong>Discussions</strong><span>Ask questions directly below lessons.</span></div>
            </div>
          </div>
          <div className="card side-panel auth-info-card">
            <p className="eyebrow">For Teachers</p>
            <h2>Publish with control</h2>
            <p className="subtle-text">Teacher accounts can upload after admin verification, then manage playlists, schedules, and student comments.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
