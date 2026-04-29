import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { clearAuth, getUser } from "../utils/auth";

const navLinkClassName = ({ isActive }) => `nav-link${isActive ? " nav-link-active" : ""}`;

export default function Navbar() {
  const user = getUser();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return undefined;

    let active = true;
    const loadNotifications = async () => {
      try {
        const { data } = await api.get("/notifications");
        if (!active) return;
        setUnreadCount(data.filter((item) => !item.readAt).length);
      } catch (_error) {
        if (!active) return;
        setUnreadCount(0);
      }
    };

    loadNotifications();
    const timer = window.setInterval(loadNotifications, 30000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [user?.id]);

  const initials = useMemo(() => (user?.name || "U").slice(0, 1).toUpperCase(), [user?.name]);

  const logout = () => {
    clearAuth();
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <Link to="/" className="brand-lockup brand-lockup-link" aria-label="LearnTics home">
        <div className="brand-mark">CL</div>
        <div>
          <div className="brand">LearnTics</div>
          <div className="brand-subtitle">Short-form learning, managed professionally</div>
        </div>
      </Link>

      <div className="nav-links">
        {!user && (
          <>
            <NavLink to="/login" className={navLinkClassName}>
              Login
            </NavLink>
            <NavLink to="/register" className={navLinkClassName}>
              Register
            </NavLink>
          </>
        )}

        {user && (
          <>
            <NavLink to="/dashboard" className={navLinkClassName}>
              Dashboard
            </NavLink>
            {user.role === "student" && (
              <NavLink to="/feed" className={navLinkClassName}>
                Feed
              </NavLink>
            )}
            {user.role === "teacher" && (
              <>
                <NavLink to="/upload" className={navLinkClassName}>
                  Upload Lessons
                </NavLink>
                <NavLink to="/manage-content" className={navLinkClassName}>
                  Manage Playlists
                </NavLink>
              </>
            )}
            {user.role === "admin" && (
              <NavLink to="/admin" className={navLinkClassName}>
                Admin Panel
              </NavLink>
            )}
            <NavLink to="/settings" className={navLinkClassName}>
              Settings
            </NavLink>

            <span className="nav-user-chip nav-user-chip--compact">
              <span className="nav-avatar">{initials}</span>
              <span className="nav-user-name">{user.name}</span>
              {unreadCount > 0 && <span className="nav-badge">{unreadCount}</span>}
            </span>

            <button className="btn ghost nav-action" onClick={logout} type="button">
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
