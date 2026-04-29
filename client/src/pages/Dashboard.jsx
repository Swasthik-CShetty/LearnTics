import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import EmptyState from "../components/EmptyState";
import SkeletonCard from "../components/SkeletonCard";
import { useToast } from "../components/ToastProvider";
import { getUser } from "../utils/auth";

const CommentTree = ({
  comments,
  replyDraft,
  setReplyDraft,
  onReply,
  onPin,
  onDelete,
  pendingCommentId,
}) => (
  <div className="dashboard-comments-list">
    {comments.map((comment) => (
      <div key={comment._id} className="dashboard-comment-node">
        <div className="comment-user-row">
          <div className="comment-avatar">{(comment.userId?.name || "U").slice(0, 1).toUpperCase()}</div>
          <div>
            <p>
              <strong>{comment.userId?.name || "User"}</strong> {comment.isPinned && <span className="badge-success">Pinned</span>}
            </p>
            <p className="subtle-text">{comment.text}</p>
          </div>
        </div>
        <div className="row">
          <input
            placeholder="Write a reply"
            value={replyDraft[comment._id] || ""}
            onChange={(e) => setReplyDraft((prev) => ({ ...prev, [comment._id]: e.target.value }))}
          />
          <button type="button" className="btn" disabled={pendingCommentId === comment._id} onClick={() => onReply(comment)}>
            {pendingCommentId === comment._id ? "Sending..." : "Reply"}
          </button>
          <button type="button" className="btn ghost small-btn" onClick={() => onPin(comment._id)}>
            {comment.isPinned ? "Unpin" : "Pin"}
          </button>
          <button type="button" className="btn ghost danger small-btn" onClick={() => onDelete(comment)}>
            Remove
          </button>
        </div>
        {!!comment.replies?.length && (
          <CommentTree
            comments={comment.replies}
            replyDraft={replyDraft}
            setReplyDraft={setReplyDraft}
            onReply={onReply}
            onPin={onPin}
            onDelete={onDelete}
            pendingCommentId={pendingCommentId}
          />
        )}
      </div>
    ))}
  </div>
);

export default function Dashboard() {
  const user = getUser();
  const isTeacher = user?.role === "teacher";
  const isStudent = user?.role === "student";
  const isAdmin = user?.role === "admin";
  const [teacherComments, setTeacherComments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [continueWatching, setContinueWatching] = useState([]);
  const [savedTopics, setSavedTopics] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingCommentId, setPendingCommentId] = useState("");
  const [replyDraft, setReplyDraft] = useState({});
  const { showToast } = useToast();

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const requests = [api.get("/notifications")];
      if (isTeacher) {
        requests.push(api.get("/comment/teacher"));
        requests.push(api.get("/progress/teacher-analytics"));
      }
      if (isStudent) {
        requests.push(api.get("/progress/continue-watching"));
        requests.push(api.get("/saved-topics"));
      }

      const results = await Promise.all(requests);
      let cursor = 0;
      setNotifications(results[cursor++].data);
      if (isTeacher) {
        setTeacherComments(results[cursor++].data);
        setAnalytics(results[cursor++].data);
      }
      if (isStudent) {
        setContinueWatching(results[cursor++].data);
        setSavedTopics(results[cursor++].data);
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Could not load dashboard", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [user?.role]);

  const postReply = async (comment) => {
    const text = replyDraft[comment._id]?.trim();
    if (!text) return;

    setPendingCommentId(comment._id);
    try {
      await api.post("/comment", { reelId: comment.reelId, parentCommentId: comment._id, text });
      setReplyDraft((prev) => ({ ...prev, [comment._id]: "" }));
      await loadDashboard();
      showToast("Reply sent.", "success");
    } catch (_err) {
      showToast("Could not send reply", "error");
    } finally {
      setPendingCommentId("");
    }
  };

  const togglePin = async (commentId) => {
    try {
      await api.patch(`/comment/${commentId}/pin`);
      await loadDashboard();
      showToast("Comment pin state updated.", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Could not update pin state", "error");
    }
  };

  const deleteComment = async (comment) => {
    try {
      await api.delete(`/comment/${comment._id}`);
      await loadDashboard();
      showToast("Comment removed.", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Could not remove comment", "error");
    }
  };

  const markNotificationRead = async (notificationId) => {
    try {
      await api.patch(`/notifications/${notificationId}/read`);
      setNotifications((prev) =>
        prev.map((item) => (item._id === notificationId ? { ...item, readAt: new Date().toISOString() } : item))
      );
    } catch (_error) {
      showToast("Could not mark notification as read", "error");
    }
  };

  const unreadNotifications = notifications.filter((item) => !item.readAt).length;
  const studentQuickStats = useMemo(
    () => [
      { label: "Unread Alerts", value: unreadNotifications },
      { label: "Continue Learning", value: continueWatching.length },
      { label: "Saved Playlists", value: savedTopics.length },
      {
        label: "Learning Streak",
        value: continueWatching.length ? `${Math.min(continueWatching.length + 1, 7)} days` : "1 day",
      },
    ],
    [continueWatching.length, savedTopics.length, unreadNotifications]
  );
  const teacherQuickStats = useMemo(
    () => [
      { label: "Playlists", value: analytics?.totals?.topics || 0 },
      { label: "Lessons", value: analytics?.totals?.reels || 0 },
      { label: "Unread Discussions", value: teacherComments.length },
      { label: "Draft + Scheduled", value: (analytics?.totals?.drafts || 0) + (analytics?.totals?.scheduled || 0) },
    ],
    [analytics, teacherComments.length]
  );
  const adminQuickStats = useMemo(
    () => [
      { label: "Unread Alerts", value: unreadNotifications },
      { label: "Admin Access", value: "Active" },
      { label: "Moderation Ready", value: "Yes" },
      { label: "System Health", value: "Stable" },
    ],
    [unreadNotifications]
  );

  if (loading) {
    return (
      <div className="page dashboard-grid">
        <SkeletonCard lines={3} />
        <SkeletonCard lines={4} />
      </div>
    );
  }

  return (
    <div className="page page-stack dashboard-page">
      <section className="card hero-card dashboard-hero">
        <div className="hero-copy">
          <p className="eyebrow">{isTeacher ? "Teacher Studio" : isAdmin ? "Control Center" : "Learning Hub"}</p>
          <h1>{isTeacher ? "Run your teaching operation" : isAdmin ? "Keep the platform healthy" : `Welcome back, ${user?.name}`}</h1>
          <p className="subtle-text hero-text">
            {isTeacher
              ? "Track uploads, watch engagement, and keep classroom discussions moving."
              : isAdmin
                ? "Review account status, monitor alerts, and keep moderation flowing smoothly."
                : "Pick up where you left off, stay on top of notifications, and move through your study flow faster."}
          </p>
          <div className="row">
            {isAdmin ? (
              <Link className="btn" to="/admin">Open Admin Panel</Link>
            ) : isTeacher ? (
              <>
                <Link className="btn" to="/upload">Upload Lessons</Link>
                <Link className="btn ghost" to="/manage-content">Manage Playlists</Link>
              </>
            ) : (
              <>
                <Link className="btn" to="/feed">Continue Learning</Link>
                <Link className="btn ghost" to="/settings">Open Settings</Link>
              </>
            )}
          </div>
        </div>
        <div className="hero-stats-grid">
          {(isTeacher ? teacherQuickStats : isAdmin ? adminQuickStats : studentQuickStats).map((item) => (
            <div key={item.label} className="hero-stat-card">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="dashboard-layout">
        <div className="dashboard-main">
          {!isTeacher && !isAdmin && (
            <>
              <div className="card section-card">
                <div className="section-header">
                  <div>
                    <p className="eyebrow">Continue Learning</p>
                    <h2>Resume your latest lessons</h2>
                  </div>
                </div>
                {!continueWatching.length ? (
                  <EmptyState title="No watch history yet" text="Start a playlist and your recent lessons will show up here." />
                ) : (
                  <div className="feature-strip">
                    {continueWatching.map((item) => (
                      <Link key={item._id} className="feature-tile" to={`/topic/${item.topicId?._id}?reel=${item.reelId?._id}`}>
                        <div className="feature-thumb" />
                        <div>
                          <strong>{item.topicId?.title}</strong>
                          <p className="subtle-text">Lesson {item.reelId?.lessonOrder}: {item.reelId?.title}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div className="card section-card">
                <div className="section-header">
                  <div>
                    <p className="eyebrow">Saved Library</p>
                    <h2>Playlists worth returning to</h2>
                  </div>
                </div>
                {!savedTopics.length ? (
                  <EmptyState title="No saved playlists" text="Use Save Playlist from the feed or topic page to build your study list." />
                ) : (
                  <div className="dashboard-mini-grid">
                    {savedTopics.map((item) => (
                      <Link key={item._id} className="mini-card-link visual-card" to={`/topic/${item.topicId?._id}`}>
                        <div className="tile-accent" />
                        <strong>{item.topicId?.title}</strong>
                        <span>{item.topicId?.category || "General"} | {item.topicId?.level || "All levels"}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {isTeacher && (
            <>
              <div className="card section-card">
                <div className="section-header">
                  <div>
                    <p className="eyebrow">Publishing Overview</p>
                    <h2>Recent content momentum</h2>
                  </div>
                </div>
                {analytics ? (
                  <div className="stats-grid">
                    <div className="stat-card"><strong>{analytics.totals.topics}</strong><span>Playlists</span></div>
                    <div className="stat-card"><strong>{analytics.totals.reels}</strong><span>Lessons</span></div>
                    <div className="stat-card"><strong>{analytics.totals.drafts}</strong><span>Drafts</span></div>
                    <div className="stat-card"><strong>{analytics.totals.scheduled}</strong><span>Scheduled</span></div>
                    <div className="stat-card"><strong>{analytics.totals.watches}</strong><span>Watches</span></div>
                    <div className="stat-card"><strong>{analytics.totals.completedLessons}</strong><span>Completed</span></div>
                  </div>
                ) : (
                  <EmptyState title="No analytics yet" text="Published lessons and student activity will fill this section." />
                )}
              </div>

              <div className="card dashboard-comments-card section-card">
                <div className="section-header">
                  <div>
                    <p className="eyebrow">Unread Discussions</p>
                    <h2>Student conversations</h2>
                  </div>
                </div>
                {!teacherComments.length ? (
                  <EmptyState title="No comments yet" text="Once learners start discussing your lessons, the threads will show up here." />
                ) : (
                  <div className="dashboard-comments-list">
                    {teacherComments.map((item) => (
                      <section key={item.reelId} className="dashboard-reel-comments">
                        <h3>{item.reelTitle}</h3>
                        <CommentTree
                          comments={item.comments}
                          replyDraft={replyDraft}
                          setReplyDraft={setReplyDraft}
                          onReply={postReply}
                          onPin={togglePin}
                          onDelete={deleteComment}
                          pendingCommentId={pendingCommentId}
                        />
                      </section>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {isAdmin && (
            <div className="card section-card">
              <div className="section-header">
                <div>
                  <p className="eyebrow">Moderation Queue</p>
                  <h2>Stay ahead of platform activity</h2>
                </div>
              </div>
              <div className="dashboard-mini-grid">
                <div className="mini-card-link visual-card">
                  <div className="tile-accent" />
                  <strong>Admin notifications</strong>
                  <span>{unreadNotifications} unread items are waiting for review.</span>
                </div>
                <div className="mini-card-link visual-card">
                  <div className="tile-accent" />
                  <strong>Teacher verification</strong>
                  <span>Use the admin panel to review account approvals and comments.</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <aside className="dashboard-sidebar">
          <div className="card side-panel">
            <div className="section-header">
              <div>
                <p className="eyebrow">Notifications</p>
                <h3>Unread activity</h3>
              </div>
            </div>
            {!notifications.length ? (
              <EmptyState title="All caught up" text="New learning and moderation activity will show up here." />
            ) : (
              <div className="notification-list">
                {notifications.slice(0, 6).map((item) => (
                  <button
                    key={item._id}
                    type="button"
                    className={`notification-item ${item.readAt ? "notification-read" : ""}`}
                    onClick={() => markNotificationRead(item._id)}
                  >
                    <strong>{item.title}</strong>
                    <span>{item.message}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="card side-panel">
            <div className="section-header">
              <div>
                <p className="eyebrow">{isTeacher ? "Publishing Calendar" : isAdmin ? "Admin Signals" : "Study Signals"}</p>
                <h3>{isTeacher ? "What needs attention" : isAdmin ? "Operational context" : "Useful context"}</h3>
              </div>
            </div>
            <div className="side-list">
              {isTeacher ? (
                <>
                  <div className="side-list-item">
                    <strong>{analytics?.totals?.drafts || 0} drafts</strong>
                    <span>Push unfinished lessons toward publishing.</span>
                  </div>
                  <div className="side-list-item">
                    <strong>{analytics?.totals?.scheduled || 0} scheduled</strong>
                    <span>Review upcoming releases and lesson order.</span>
                  </div>
                  <div className="side-list-item">
                    <strong>{teacherComments.length} discussion threads</strong>
                    <span>Reply quickly to keep learners engaged.</span>
                  </div>
                </>
              ) : isAdmin ? (
                <>
                  <div className="side-list-item">
                    <strong>{unreadNotifications} unread alerts</strong>
                    <span>Review new platform activity and moderation signals.</span>
                  </div>
                  <div className="side-list-item">
                    <strong>Admin session active</strong>
                    <span>Use the admin panel to verify teachers and manage reports.</span>
                  </div>
                  <div className="side-list-item">
                    <strong>Platform health stable</strong>
                    <span>Critical dashboard actions are available and ready.</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="side-list-item">
                    <strong>{savedTopics.length} playlists saved</strong>
                    <span>Build a study shelf you can return to fast.</span>
                  </div>
                  <div className="side-list-item">
                    <strong>{continueWatching.length} in progress</strong>
                    <span>Keep momentum by finishing active lessons first.</span>
                  </div>
                  <div className="side-list-item">
                    <strong>{user?.emailVerified ? "Verified" : "Verify your email"}</strong>
                    <span>{user?.emailVerified ? "Your account is in good shape." : "Unlock a more trusted account experience."}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
