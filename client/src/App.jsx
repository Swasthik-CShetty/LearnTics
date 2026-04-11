import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Feed from "./pages/Feed";
import AdminDashboard from "./pages/AdminDashboard";
import AdminLogin from "./pages/AdminLogin";
import Login from "./pages/Login";
import ManageContent from "./pages/ManageContent";
import Register from "./pages/Register";
import TopicPage from "./pages/TopicPage";
import Upload from "./pages/Upload";
import { getToken, getUser } from "./utils/auth";

function HomeRedirect() {
  const token = getToken();
  const user = getUser();

  if (!token || !user) return <Navigate to="/login" replace />;

  if (user.role === "admin") return <Navigate to="/admin" replace />;
  return <Navigate to={user.role === "teacher" ? "/upload" : "/feed"} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute roles={["student", "teacher", "admin"]}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/upload"
          element={
            <ProtectedRoute roles={["teacher"]}>
              <Upload />
            </ProtectedRoute>
          }
        />

        <Route
          path="/manage-content"
          element={
            <ProtectedRoute roles={["teacher"]}>
              <ManageContent />
            </ProtectedRoute>
          }
        />

        <Route
          path="/feed"
          element={
            <ProtectedRoute roles={["student"]}>
              <Feed />
            </ProtectedRoute>
          }
        />

        <Route
          path="/topic/:id"
          element={
            <ProtectedRoute roles={["student", "teacher"]}>
              <TopicPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
