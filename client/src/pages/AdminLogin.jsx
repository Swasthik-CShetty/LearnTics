import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { setAuth } from "../utils/auth";

export default function AdminLogin() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/admin/login", form);
      setAuth(data);
      navigate("/dashboard");
    } catch (err) {
      alert(err.response?.data?.message || "Admin login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page auth-page">
      <form className="card form-card" onSubmit={submit}>
        <h1>Admin Login</h1>
        <p className="subtle-text">Review and verify teacher accounts.</p>
        <input
          required
          type="email"
          placeholder="Admin Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          required
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <button className="btn" disabled={loading}>
          {loading ? "Signing in..." : "Login as Admin"}
        </button>
        <p>
          User login? <Link to="/login">Go to Login</Link>
        </p>
      </form>
    </div>
  );
}
