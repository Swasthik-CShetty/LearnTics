import { useEffect, useState } from "react";
import EmptyState from "../components/EmptyState";
import SkeletonCard from "../components/SkeletonCard";
import api from "../api/axios";
import { useToast } from "../components/ToastProvider";

export default function AdminDashboard() {
  const [teachers, setTeachers] = useState([]);
  const [reportedComments, setReportedComments] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const { showToast } = useToast();

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [teachersRes, commentsRes, logsRes] = await Promise.all([
        api.get("/admin/teachers"),
        api.get("/admin/reported-comments"),
        api.get("/admin/audit-logs"),
      ]);
      setTeachers(teachersRes.data);
      setReportedComments(commentsRes.data);
      setAuditLogs(logsRes.data);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to load admin data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const setVerification = async (teacherId, verified) => {
    setUpdatingId(teacherId);
    try {
      const { data } = await api.patch(`/admin/teachers/${teacherId}/verify`, { verified });
      setTeachers((prev) =>
        prev.map((teacher) =>
          teacher._id === teacherId ? { ...teacher, isTeacherVerified: verified } : teacher
        )
      );

      if (verified) {
        showToast(
          data?.email?.sent ? "Teacher verified and email sent successfully." : "Teacher verified.",
          "success"
        );
      } else {
        showToast("Teacher verification removed.", "success");
      }
      await loadAdminData();
    } catch (err) {
      showToast(err.response?.data?.message || "Could not update teacher verification", "error");
    } finally {
      setUpdatingId("");
    }
  };

  const moderateComment = async (commentId, action) => {
    try {
      await api.patch(`/admin/comments/${commentId}/moderate`, { action });
      showToast(`Comment ${action}d successfully.`, "success");
      await loadAdminData();
    } catch (err) {
      showToast(err.response?.data?.message || "Could not moderate comment", "error");
    }
  };

  if (loading) {
    return (
      <div className="page admin-grid">
        <SkeletonCard lines={4} />
        <SkeletonCard lines={4} />
      </div>
    );
  }

  return (
    <div className="page admin-grid">
      <div className="card panel-card">
        <h1>Admin Panel</h1>
        <p className="subtle-text">Verify teachers, moderate reports, and track admin actions.</p>
        {!teachers.length ? (
          <EmptyState title="No teachers found" text="New teacher registrations will appear here for review." />
        ) : (
          <div className="admin-teacher-list">
            {teachers.map((teacher) => {
              const isUpdating = updatingId === teacher._id;
              return (
                <div key={teacher._id} className="teacher-row">
                  <div>
                    <strong>{teacher.name}</strong>
                    <p>{teacher.email}</p>
                  </div>
                  <div className="row">
                    <span className={teacher.isTeacherVerified ? "badge-success" : "badge-pending"}>
                      {teacher.isTeacherVerified ? "Verified" : "Pending"}
                    </span>
                    {teacher.isTeacherVerified ? (
                      <button
                        type="button"
                        className="btn ghost"
                        disabled={isUpdating}
                        onClick={() => setVerification(teacher._id, false)}
                      >
                        {isUpdating ? "Updating..." : "Unverify"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn"
                        disabled={isUpdating}
                        onClick={() => setVerification(teacher._id, true)}
                      >
                        {isUpdating ? "Updating..." : "Verify"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card panel-card">
        <h2>Reported Comments</h2>
        {!reportedComments.length ? (
          <EmptyState title="No reports waiting" text="Reported discussions will appear here for moderation." />
        ) : (
          <div className="admin-teacher-list">
            {reportedComments.map((comment) => (
              <div key={comment._id} className="teacher-row teacher-row-stack">
                <div>
                  <strong>{comment.userId?.name || "User"}</strong>
                  <p>{comment.text}</p>
                  <p>Reports: {comment.reportCount || 0}</p>
                </div>
                <div className="row">
                  <button type="button" className="btn ghost" onClick={() => moderateComment(comment._id, "restore")}>
                    Restore
                  </button>
                  <button type="button" className="btn ghost danger" onClick={() => moderateComment(comment._id, "hide")}>
                    Hide
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card panel-card">
        <h2>Audit Log</h2>
        {!auditLogs.length ? (
          <EmptyState title="No admin actions yet" text="Verification and moderation changes will be recorded here." />
        ) : (
          <div className="audit-log-list">
            {auditLogs.map((log) => {
              const actorName = log.actorUserId?.name || "Admin";
              return (
                <div key={log._id} className="audit-log-item">
                  <strong>{log.summary}</strong>
                  <span>{`${actorName} | ${new Date(log.createdAt).toLocaleString()}`}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
