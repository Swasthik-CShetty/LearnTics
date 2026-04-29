import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import EmptyState from "../components/EmptyState";
import SkeletonCard from "../components/SkeletonCard";
import { useToast } from "../components/ToastProvider";
import { getUser } from "../utils/auth";

const CommentAvatar = ({ user }) => (
  <div className="comment-avatar">{(user?.name || "U").slice(0, 1).toUpperCase()}</div>
);

const renderCommentItems = ({
  items,
  reelId,
  draft,
  setDraft,
  replyParentId,
  setReplyParentId,
  actions,
  editingId,
  editDraft,
  setEditDraft,
  currentUserId,
}) =>
  items.map((comment) => {
    const canEdit = String(comment.userId?._id || comment.userId) === String(currentUserId);

    return (
      <div key={comment._id} className="comment-thread-item">
        <div className="comment-header-row">
          <div className="comment-user-row">
            <CommentAvatar user={comment.userId} />
            <div>
              <div className="comment-thread-head">
                <strong>{comment.userId?.name || "User"}</strong>
                <span className="comment-role">{comment.userId?.role || "member"}</span>
                {comment.isPinned && <span className="badge-success">Pinned</span>}
                {comment.isEdited && <span className="mini-chip">Edited</span>}
              </div>
            </div>
          </div>
        </div>

        {editingId === comment._id ? (
          <div className="row comment-reply-box">
            <input value={editDraft} onChange={(e) => setEditDraft(e.target.value)} />
            <button className="btn small-btn" type="button" onClick={() => actions.saveEdit(comment._id, reelId)}>
              Save
            </button>
            <button className="btn ghost small-btn" type="button" onClick={() => actions.cancelEdit()}>
              Cancel
            </button>
          </div>
        ) : (
          <p>{comment.text}</p>
        )}

        <div className="row">
          <button className="btn ghost small-btn" type="button" onClick={() => setReplyParentId(comment._id)}>
            Reply
          </button>
          <button className="btn ghost small-btn" type="button" onClick={() => actions.reportComment(comment._id)}>
            Report
          </button>
          {canEdit && (
            <>
              <button className="btn ghost small-btn" type="button" onClick={() => actions.startEdit(comment)}>
                Edit
              </button>
              <button className="btn ghost danger small-btn" type="button" onClick={() => actions.deleteComment(comment._id, reelId)}>
                Delete
              </button>
            </>
          )}
        </div>

        {replyParentId === comment._id && (
          <div className="row comment-reply-box">
            <input
              placeholder="Write a reply"
              value={draft[`${reelId}:${comment._id}`] || ""}
              onChange={(e) => setDraft((prev) => ({ ...prev, [`${reelId}:${comment._id}`]: e.target.value }))}
            />
            <button
              className="btn small-btn"
              type="button"
              onClick={() => actions.postComment(reelId, comment._id, `${reelId}:${comment._id}`)}
            >
              Reply
            </button>
          </div>
        )}

        {!!comment.replies?.length && (
          <div className="comment-replies">
            {renderCommentItems({
              items: comment.replies,
              reelId,
              draft,
              setDraft,
              replyParentId,
              setReplyParentId,
              actions,
              editingId,
              editDraft,
              setEditDraft,
              currentUserId,
            })}
          </div>
        )}
      </div>
    );
  });

export default function Feed() {
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState({});
  const [draft, setDraft] = useState({});
  const [replyParentId, setReplyParentId] = useState("");
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [savedOnly, setSavedOnly] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [editDraft, setEditDraft] = useState("");
  const deferredSearch = useDeferredValue(searchText);
  const { showToast } = useToast();
  const user = getUser();

  const lessonCountByTopic = reels.reduce((acc, reel) => {
    const topicId = reel.topicId?._id || reel.topicId;
    if (!topicId) return acc;
    acc[topicId] = (acc[topicId] || 0) + 1;
    return acc;
  }, {});

  const categories = useMemo(
    () => ["all", ...new Set(reels.map((reel) => reel.topicId?.category).filter(Boolean))],
    [reels]
  );
  const featuredPlaylists = useMemo(() => [...reels].sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0)).slice(0, 4), [reels]);
  const recentUploads = useMemo(
    () => [...reels].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 4),
    [reels]
  );
  const popularTopics = useMemo(() => {
    const seen = new Set();
    return featuredPlaylists.filter((item) => {
      const topicId = String(item.topicId?._id || item.topicId);
      if (seen.has(topicId)) return false;
      seen.add(topicId);
      return true;
    });
  }, [featuredPlaylists]);

  const filteredReels = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    return reels.filter((reel) => {
      const matchesSearch =
        !query ||
        reel.title?.toLowerCase().includes(query) ||
        reel.topicId?.title?.toLowerCase().includes(query) ||
        reel.teacherId?.name?.toLowerCase().includes(query) ||
        reel.topicId?.tags?.some((tag) => tag.toLowerCase().includes(query));

      const matchesCategory = selectedCategory === "all" || reel.topicId?.category === selectedCategory;
      const matchesSaved = !savedOnly || Boolean(reel.topicId?.isSaved);

      return matchesSearch && matchesCategory && matchesSaved;
    });
  }, [deferredSearch, reels, savedOnly, selectedCategory]);

  const loadReels = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/reels");
      setReels(data);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to load feed", "error");
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
      showToast(err.response?.data?.message || "Like failed", "error");
    }
  };

  const toggleSaveTopic = async (topicId) => {
    try {
      const { data } = await api.post(`/saved-topics/${topicId}/toggle`);
      setReels((prev) =>
        prev.map((reel) =>
          String(reel.topicId?._id || reel.topicId) === String(topicId)
            ? { ...reel, topicId: { ...reel.topicId, isSaved: data.saved } }
            : reel
        )
      );
      showToast(data.message, "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Could not update saved playlist", "error");
    }
  };

  const loadComments = async (reelId) => {
    try {
      const { data } = await api.get(`/comment/${reelId}`);
      setComments((prev) => ({ ...prev, [reelId]: data }));
    } catch (err) {
      showToast(err.response?.data?.message || "Could not load comments", "error");
    }
  };

  const postComment = async (reelId, parentCommentId = null, draftKey = reelId) => {
    const text = draft[draftKey]?.trim();
    if (!text) return;

    try {
      await api.post("/comment", { reelId, text, parentCommentId });
      await loadComments(reelId);
      setDraft((prev) => ({ ...prev, [draftKey]: "" }));
      setReplyParentId("");
      showToast(parentCommentId ? "Reply posted." : "Comment posted.", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Could not post comment", "error");
    }
  };

  const reportComment = async (commentId) => {
    try {
      const { data } = await api.post(`/comment/${commentId}/report`);
      showToast(data.message, "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Could not report comment", "error");
    }
  };

  const startEdit = (comment) => {
    setEditingId(comment._id);
    setEditDraft(comment.text);
  };

  const cancelEdit = () => {
    setEditingId("");
    setEditDraft("");
  };

  const saveEdit = async (commentId, reelId) => {
    if (!editDraft.trim()) return;
    try {
      await api.patch(`/comment/${commentId}`, { text: editDraft });
      await loadComments(reelId);
      cancelEdit();
      showToast("Comment updated.", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Could not update comment", "error");
    }
  };

  const deleteComment = async (commentId, reelId) => {
    try {
      await api.delete(`/comment/${commentId}`);
      await loadComments(reelId);
      showToast("Comment deleted.", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Could not delete comment", "error");
    }
  };

  if (loading) {
    return (
      <div className="feed-loading">
        <SkeletonCard lines={4} />
        <SkeletonCard lines={4} />
      </div>
    );
  }

  if (!reels.length) {
    return (
      <div className="page centered">
        <EmptyState title="No lessons yet" text="Ask a teacher to publish a playlist so students can start learning." />
      </div>
    );
  }

  return (
    <div className="page page-stack">
      <section className="card hero-card feed-hero">
        <div className="hero-copy">
          <p className="eyebrow">Learning Feed</p>
          <h1>Discover your next study block</h1>
          <p className="subtle-text hero-text">
            Browse short-form lessons, return to saved playlists, and keep your learning queue moving with better discovery.
          </p>
        </div>
        <div className="hero-stats-grid">
          <div className="hero-stat-card"><span>Lessons Available</span><strong>{reels.length}</strong></div>
          <div className="hero-stat-card"><span>Categories</span><strong>{categories.length - 1}</strong></div>
          <div className="hero-stat-card"><span>Saved Matches</span><strong>{reels.filter((item) => item.topicId?.isSaved).length}</strong></div>
          <div className="hero-stat-card"><span>Popular Picks</span><strong>{featuredPlaylists.length}</strong></div>
        </div>
      </section>

      <div className="feature-strip feature-strip-wide">
        {featuredPlaylists.map((item) => (
          <Link key={item._id} className="feature-tile feature-tile-large" to={`/topic/${item.topicId?._id || item.topicId}?reel=${item._id}`}>
            <div className="feature-thumb" />
            <div>
              <strong>{item.topicId?.title || item.title}</strong>
              <p className="subtle-text">{item.teacherId?.name || "Unknown"} | {item.likesCount || 0} likes</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="card filter-card section-card">
        <div className="section-header">
          <div>
            <p className="eyebrow">Quick Filters</p>
            <h2>Refine what you watch</h2>
          </div>
        </div>
        <div className="row">
          <input
            placeholder="Search lessons, playlists, teachers, or tags"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category === "all" ? "All categories" : category}
              </option>
            ))}
          </select>
          <button className={`btn ${savedOnly ? "" : "ghost"}`} type="button" onClick={() => setSavedOnly((prev) => !prev)}>
            {savedOnly ? "Showing Saved" : "Saved Only"}
          </button>
        </div>
      </div>

      <section className="feed-layout">
        <div className="feed-main">
          {!filteredReels.length ? (
            <div className="card section-card">
              <EmptyState title="No results" text="Try a different search, category, or saved filter." />
            </div>
          ) : (
            <div className="feed-container">
              {filteredReels.map((reel) => {
                const topicId = reel.topicId?._id || reel.topicId;
                const commentItems = comments[reel._id] || [];

                return (
                  <section key={reel._id} className="reel-card">
                    <video src={reel.videoUrl} controls muted loop playsInline className="reel-video" />
                    <div className="reel-overlay">
                      <h2 className="reel-title">{reel.title}</h2>
                      <p className="reel-meta">Teacher: {reel.teacherId?.name || "Unknown"}</p>
                      <p className="reel-meta">
                        Playlist: {reel.topicId?.title || "Untitled"} | Lessons: {lessonCountByTopic[topicId] || 1}
                      </p>
                      <p className="reel-meta">
                        {reel.topicId?.level || "General"} | {reel.topicId?.category || "Uncategorized"} | {reel.commentsCount || 0} comments
                      </p>
                      {!!reel.topicId?.tags?.length && (
                        <div className="chip-row">
                          {reel.topicId.tags.slice(0, 4).map((tag) => (
                            <span key={tag} className="mini-chip">{tag}</span>
                          ))}
                        </div>
                      )}
                      <div className="row">
                        <button className="btn" onClick={() => toggleLike(reel._id)} type="button">
                          {reel.likedByMe ? "Unlike" : "Like"} ({reel.likesCount || 0})
                        </button>
                        <button className="btn ghost" type="button" onClick={() => toggleSaveTopic(topicId)}>
                          {reel.topicId?.isSaved ? "Saved" : "Save Playlist"}
                        </button>
                        <Link className="btn ghost" to={`/topic/${topicId}?reel=${reel._id}`}>
                          Open Topic
                        </Link>
                        <button className="btn ghost" onClick={() => loadComments(reel._id)} type="button">
                          Discussion
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
                          {!commentItems.length ? (
                            <p className="subtle-text">No comments loaded yet. Start the discussion.</p>
                          ) : (
                            renderCommentItems({
                              items: commentItems.slice(0, 8),
                              reelId: reel._id,
                              draft,
                              setDraft,
                              replyParentId,
                              setReplyParentId,
                              actions: { postComment, reportComment, startEdit, cancelEdit, saveEdit, deleteComment },
                              editingId,
                              editDraft,
                              setEditDraft,
                              currentUserId: user?.id,
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>

        <aside className="feed-sidebar">
          <div className="card side-panel">
            <div className="section-header">
              <div>
                <p className="eyebrow">Popular Playlists</p>
                <h3>What others are liking</h3>
              </div>
            </div>
            <div className="side-list">
              {popularTopics.map((item) => (
                <Link key={item._id} className="side-list-item side-button" to={`/topic/${item.topicId?._id || item.topicId}`}>
                  <strong>{item.topicId?.title || item.title}</strong>
                  <span>{item.likesCount || 0} likes | {item.commentsCount || 0} comments</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="card side-panel">
            <div className="section-header">
              <div>
                <p className="eyebrow">Recently Uploaded</p>
                <h3>Fresh lessons</h3>
              </div>
            </div>
            <div className="feature-strip vertical-strip">
              {recentUploads.map((item) => (
                <Link key={item._id} className="feature-tile compact-feature" to={`/topic/${item.topicId?._id || item.topicId}?reel=${item._id}`}>
                  <div className="feature-thumb" />
                  <div>
                    <strong>{item.title}</strong>
                    <p className="subtle-text">{item.topicId?.title || "Untitled"}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="card side-panel">
            <div className="section-header">
              <div>
                <p className="eyebrow">Study Tips</p>
                <h3>Use the feed better</h3>
              </div>
            </div>
            <div className="side-list">
              <div className="side-list-item">
                <strong>Save playlists early</strong>
                <span>Build a shelf of topics you want to revisit later.</span>
              </div>
              <div className="side-list-item">
                <strong>Search by tags</strong>
                <span>Tags and category filters are the fastest way to narrow the feed.</span>
              </div>
              <div className="side-list-item">
                <strong>Join discussions</strong>
                <span>Questions and comments help you remember and revisit key lessons.</span>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
