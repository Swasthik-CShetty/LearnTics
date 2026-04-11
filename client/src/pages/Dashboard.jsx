import { Link } from "react-router-dom";
import { getUser } from "../utils/auth";

export default function Dashboard() {
  const user = getUser();

  return (
    <div className="page">
      <div className="card dashboard-card">
        <h1>Welcome, {user?.name}</h1>
        <p className="subtle-text">Role: {user?.role}</p>
        {user?.role === "admin" ? (
          <Link className="btn" to="/admin">
            Open Admin Panel
          </Link>
        ) : user?.role === "teacher" ? (
          <div className="row">
            <Link className="btn" to="/upload">
              Go to Upload
            </Link>
            <Link className="btn ghost" to="/manage-content">
              Manage Content
            </Link>
          </div>
        ) : (
          <Link className="btn" to="/feed">
            Go to Feed
          </Link>
        )}
      </div>
    </div>
  );
}
