import { useEffect, useState } from "react";
import api from "../api/axios";
import Spinner from "../components/Spinner";

export default function AdminDashboard() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [notice, setNotice] = useState(null);

  const loadTeachers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/teachers");
      setTeachers(data);
      setNotice(null);
    } catch (err) {
      setNotice({
        type: "error",
        text: err.response?.data?.message || "Failed to load teachers",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeachers();
  }, []);

  const setVerification = async (teacherId, verified) => {
    setUpdatingId(teacherId);
    setNotice(null);
    try {
      const { data } = await api.patch(`/admin/teachers/${teacherId}/verify`, { verified });
      setTeachers((prev) =>
        prev.map((teacher) =>
          teacher._id === teacherId ? { ...teacher, isTeacherVerified: verified } : teacher
        )
      );

      if (verified) {
        if (data?.email?.sent) {
          setNotice({
            type: "success",
            text: "Teacher verified and email sent successfully.",
          });
        } else {
          setNotice({
            type: "warn",
            text: `Teacher verified, but email was not sent${
              data?.email?.reason ? `: ${data.email.reason}` : "."
            }`,
          });
        }
      } else {
        setNotice({
          type: "success",
          text: "Teacher verification removed.",
        });
      }
    } catch (err) {
      setNotice({
        type: "error",
        text: err.response?.data?.message || "Could not update teacher verification",
      });
    } finally {
      setUpdatingId("");
    }
  };

  if (loading) {
    return (
      <div className="page centered">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="card panel-card">
        <h1>Admin Panel</h1>
        <p className="subtle-text">Verify teachers before they can upload reels.</p>
        {notice && <div className={`notice notice-${notice.type}`}>{notice.text}</div>}
        {!teachers.length && <p>No teacher accounts found.</p>}
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
      </div>
    </div>
  );
}
