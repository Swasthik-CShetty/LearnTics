import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import Spinner from "../components/Spinner";

export default function Feed() {
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState({});
  const [draft, setDraft] = useState({});

  const loadReels = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/reels");
      setReels(data);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to load feed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReels();
  }, []);

  const toggleLike = async (reelId) => {
    try {
      const { data } = await api.post(`/like/${reelId}`);
      setReels((prev) =>
        prev.map((r) => (r._id === reelId ? { ...r, likedByMe: data.liked, likesCount: data.likesCount } : r))
      );
    } catch (err) {
      alert(err.response?.data?.message || "Like failed");
    }
  };

  const loadComments = async (reelId) => {
    if (comments[reelId]) return;
    try {
      const { data } = await api.get(`/comment/${reelId}`);
      setComments((prev) => ({ ...prev, [reelId]: data }));
    } catch (err) {
      alert(err.response?.data?.message || "Could not load comments");
    }
  };

  const postComment = async (reelId) => {
    const text = draft[reelId]?.trim();
    if (!text) return;

    try {
      const { data } = await api.post("/comment", { reelId, text });
      setComments((prev) => ({ ...prev, [reelId]: [data, ...(prev[reelId] || [])] }));
      setDraft((prev) => ({ ...prev, [reelId]: "" }));
    } catch (err) {
      alert(err.response?.data?.message || "Could not post comment");
    }
  };

  if (loading) {
    return (
      <div className="page centered">
        <Spinner />
      </div>
    );
  }

  if (!reels.length) {
    return (
      <div className="page centered">
        <div className="card">No reels yet. Ask a teacher to upload one.</div>
      </div>
    );
  }

  return (
    <div className="feed-container">
      {reels.map((reel) => (
        <section key={reel._id} className="reel-card">
          <video src={reel.videoUrl} controls autoPlay muted loop playsInline className="reel-video" />
          <div className="reel-overlay">
            <h2 className="reel-title">{reel.title}</h2>
            <p className="reel-meta">Teacher: {reel.teacherId?.name || "Unknown"}</p>
            <div className="row">
              <button className="btn" onClick={() => toggleLike(reel._id)} type="button">
                {reel.likedByMe ? "Unlike" : "Like"} ({reel.likesCount || 0})
              </button>
              <Link className="btn ghost" to={`/topic/${reel.topicId?._id || reel.topicId}?reel=${reel._id}`}>
                Open Topic
              </Link>
              <button className="btn ghost" onClick={() => loadComments(reel._id)} type="button">
                Comments
              </button>
            </div>
            <div className="comment-box">
              <div className="row">
                <input
                  placeholder="Write a comment"
                  value={draft[reel._id] || ""}
                  onChange={(e) => setDraft((prev) => ({ ...prev, [reel._id]: e.target.value }))}
                />
                <button className="btn" onClick={() => postComment(reel._id)} type="button">
                  Post
                </button>
              </div>
              <div className="comments-list">
                {(comments[reel._id] || []).slice(0, 4).map((c) => (
                  <p key={c._id}>
                    <strong>{c.userId?.name || "User"}:</strong> {c.text}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
