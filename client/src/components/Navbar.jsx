import { Link, useNavigate } from "react-router-dom";
import { clearAuth, getUser } from "../utils/auth";

export default function Navbar() {
  const user = getUser();
  const navigate = useNavigate();

  const logout = () => {
    clearAuth();
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <div className="brand">Study Reels</div>
      <div className="nav-links">
        {!user && <Link to="/login">Login</Link>}
        {!user && <Link to="/admin/login">Admin Login</Link>}
        {!user && <Link to="/register">Register</Link>}
        {user && <Link to="/dashboard">Dashboard</Link>}
        {user?.role === "student" && <Link to="/feed">Feed</Link>}
        {user?.role === "teacher" && <Link to="/upload">Upload</Link>}
        {user?.role === "teacher" && <Link to="/manage-content">Manage Content</Link>}
        {user?.role === "admin" && <Link to="/admin">Admin Panel</Link>}
        {user && (
          <button className="btn ghost" onClick={logout} type="button">
            Logout
          </button>
        )}
      </div>
    </nav>
  );
}
