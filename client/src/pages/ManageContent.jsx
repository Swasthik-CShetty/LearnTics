import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import EmptyState from "../components/EmptyState";
import SkeletonCard from "../components/SkeletonCard";
import { useToast } from "../components/ToastProvider";

export default function ManageContent() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const { showToast } = useToast();

  const loadMyContent = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/reels/my");
      setItems(
        data.map((reel) => ({
          ...reel,
          topicTitle: reel.topicId?.title || "",
          description: reel.topicId?.description || "",
          notes: reel.topicId?.notes || "",
          pdfUrl: reel.topicId?.pdfUrl || "",
          coverImage: reel.topicId?.coverImage || "",
          category: reel.topicId?.category || "",
          level: reel.topicId?.level || "",
          estimatedMinutes: reel.topicId?.estimatedMinutes || 0,
          tags: reel.topicId?.tags?.join(", ") || "",
          learningObjectives: reel.topicId?.learningObjectives?.join("\n") || "",
          topicStatus: reel.topicId?.status || reel.status || "published",
          scheduledPublishAt: reel.topicId?.scheduledPublishAt || reel.scheduledPublishAt || "",
        }))
      );
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to load your uploads", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMyContent();
  }, []);

  const grouped = useMemo(() => {
    const map = new Map();
    items.forEach((item) => {
      const key = item.topicId?._id || item.topicId;
      if (!map.has(key)) {
        map.set(key, {
          topicId: key,
          topicTitle: item.topicTitle,
          items: [],
        });
      }
      map.get(key).items.push(item);
    });

    return [...map.values()].map((group) => ({
      ...group,
      items: [...group.items].sort((a, b) => (a.lessonOrder || 0) - (b.lessonOrder || 0)),
    }));
  }, [items]);

  const contentStats = useMemo(() => {
    const lessons = items.length;
    const playlists = grouped.length;
    const drafts = items.filter((item) => item.topicStatus === "draft").length;
    const scheduled = items.filter((item) => item.topicStatus === "scheduled").length;
    return { lessons, playlists, drafts, scheduled };
  }, [grouped.length, items]);

  const scheduledItems = items.filter((item) => item.topicStatus === "scheduled").slice(0, 5);
  const recentItems = [...items]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  const patchField = (id, key, value) => {
    setItems((prev) => prev.map((item) => (item._id === id ? { ...item, [key]: value } : item)));
  };

  const moveLesson = async (group, index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= group.items.length) return;

    const ordered = [...group.items];
    [ordered[index], ordered[nextIndex]] = [ordered[nextIndex], ordered[index]];
    const orderedReelIds = ordered.map((item) => item._id);

    try {
      await api.post("/reels/reorder", { topicId: group.topicId, orderedReelIds });
      await loadMyContent();
      showToast("Playlist reordered successfully.", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Could not reorder playlist", "error");
    }
  };

  const saveItem = async (item) => {
    setSavingId(item._id);
    try {
      const { data } = await api.patch(`/reels/${item._id}`, {
        title: item.title,
        lessonOrder: item.lessonOrder,
        thumbnail: item.thumbnail || "",
        topicTitle: item.topicTitle,
        description: item.description || "",
        notes: item.notes || "",
        pdfUrl: item.pdfUrl || "",
        coverImage: item.coverImage || "",
        category: item.category || "",
        level: item.level || "",
        estimatedMinutes: item.estimatedMinutes || 0,
        tags: item.tags || "",
        learningObjectives: item.learningObjectives || "",
        status: item.topicStatus,
        scheduledPublishAt: item.scheduledPublishAt || "",
        summary: item.summary || "",
        durationSeconds: item.durationSeconds || 0,
      });

      const updated = data.reel;
      setItems((prev) =>
        prev.map((x) =>
          x._id === item._id
            ? {
                ...updated,
                topicTitle: updated.topicId?.title || "",
                description: updated.topicId?.description || "",
                notes: updated.topicId?.notes || "",
                pdfUrl: updated.topicId?.pdfUrl || "",
                coverImage: updated.topicId?.coverImage || "",
                category: updated.topicId?.category || "",
                level: updated.topicId?.level || "",
                estimatedMinutes: updated.topicId?.estimatedMinutes || 0,
                tags: updated.topicId?.tags?.join(", ") || "",
                learningObjectives: updated.topicId?.learningObjectives?.join("\n") || "",
                topicStatus: updated.topicId?.status || updated.status,
                scheduledPublishAt: updated.topicId?.scheduledPublishAt || updated.scheduledPublishAt || "",
              }
            : x
        )
      );
      showToast("Content updated successfully.", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Could not save changes", "error");
    } finally {
      setSavingId("");
    }
  };

  const deleteItem = async (item) => {
    const ok = window.confirm(`Delete "${item.title}"? This cannot be undone.`);
    if (!ok) return;

    setDeletingId(item._id);
    try {
      await api.delete(`/reels/${item._id}`);
      setItems((prev) => prev.filter((x) => x._id !== item._id));
      showToast("Content deleted successfully.", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Could not delete content", "error");
    } finally {
      setDeletingId("");
    }
  };

  if (loading) {
    return (
      <div className="page">
        <SkeletonCard lines={5} />
      </div>
    );
  }

  return (
    <div className="page page-stack">
      <section className="card hero-card manage-hero">
        <div className="hero-copy">
          <p className="eyebrow">Content Studio</p>
          <h1>Manage uploaded content</h1>
          <p className="subtle-text hero-text">
            Keep metadata sharp, reorder lessons, prepare releases, and turn your teaching library into a polished catalog.
          </p>
          <div className="row">
            <a className="btn" href="/upload">Upload New Lesson</a>
            <button className="btn ghost" type="button" onClick={loadMyContent}>Refresh Library</button>
          </div>
        </div>
        <div className="hero-stats-grid">
          <div className="hero-stat-card"><span>Playlists</span><strong>{contentStats.playlists}</strong></div>
          <div className="hero-stat-card"><span>Lessons</span><strong>{contentStats.lessons}</strong></div>
          <div className="hero-stat-card"><span>Drafts</span><strong>{contentStats.drafts}</strong></div>
          <div className="hero-stat-card"><span>Scheduled</span><strong>{contentStats.scheduled}</strong></div>
        </div>
      </section>

      <section className="manage-layout">
        <div className="manage-main">
          {!grouped.length && (
            <div className="card section-card">
              <EmptyState title="Nothing uploaded yet" text="Create a lesson or course playlist to unlock the management tools." />
            </div>
          )}

          <div className="manage-grid">
            {grouped.map((group) => (
              <section key={group.topicId} className="manage-group card section-card">
                <div className="section-header">
                  <div>
                    <p className="eyebrow">Playlist</p>
                    <h2>{group.topicTitle || "Untitled Playlist"}</h2>
                  </div>
                  <span className="mini-chip">{group.items.length} lessons</span>
                </div>
                <div className="manage-grid">
                  {group.items.map((item, index) => {
                    const busy = savingId === item._id || deletingId === item._id;
                    return (
                      <section className="manage-card" key={item._id}>
                        <div className="row row-between">
                          <h3>{item.title}</h3>
                          <span className="mini-chip">Lesson {item.lessonOrder || index + 1}</span>
                        </div>
                        <p className="muted">Uploaded: {new Date(item.createdAt).toLocaleString()}</p>
                        <video src={item.videoUrl} controls className="topic-video" />

                        <input placeholder="Lesson Title" value={item.title} onChange={(e) => patchField(item._id, "title", e.target.value)} />
                        <textarea placeholder="Lesson Summary" value={item.summary || ""} onChange={(e) => patchField(item._id, "summary", e.target.value)} />
                        <input type="number" min="0" placeholder="Duration (seconds)" value={item.durationSeconds || 0} onChange={(e) => patchField(item._id, "durationSeconds", e.target.value)} />
                        <input placeholder="Playlist / Course Title" value={item.topicTitle} onChange={(e) => patchField(item._id, "topicTitle", e.target.value)} />
                        <textarea placeholder="Description" value={item.description} onChange={(e) => patchField(item._id, "description", e.target.value)} />
                        <textarea placeholder="Notes" value={item.notes} onChange={(e) => patchField(item._id, "notes", e.target.value)} />
                        <input placeholder="Category" value={item.category} onChange={(e) => patchField(item._id, "category", e.target.value)} />
                        <input placeholder="Level" value={item.level} onChange={(e) => patchField(item._id, "level", e.target.value)} />
                        <input type="number" min="0" placeholder="Estimated minutes" value={item.estimatedMinutes || 0} onChange={(e) => patchField(item._id, "estimatedMinutes", e.target.value)} />
                        <input placeholder="Tags, comma separated" value={item.tags} onChange={(e) => patchField(item._id, "tags", e.target.value)} />
                        <textarea placeholder="Learning objectives, one per line" value={item.learningObjectives} onChange={(e) => patchField(item._id, "learningObjectives", e.target.value)} />
                        <input placeholder="PDF URL" value={item.pdfUrl} onChange={(e) => patchField(item._id, "pdfUrl", e.target.value)} />
                        <input placeholder="Playlist Cover Image URL" value={item.coverImage || ""} onChange={(e) => patchField(item._id, "coverImage", e.target.value)} />
                        <input placeholder="Thumbnail URL" value={item.thumbnail || ""} onChange={(e) => patchField(item._id, "thumbnail", e.target.value)} />
                        <select value={item.topicStatus} onChange={(e) => patchField(item._id, "topicStatus", e.target.value)}>
                          <option value="published">Published</option>
                          <option value="draft">Draft</option>
                          <option value="scheduled">Scheduled</option>
                        </select>
                        {item.topicStatus === "scheduled" && (
                          <input
                            type="datetime-local"
                            value={item.scheduledPublishAt ? new Date(item.scheduledPublishAt).toISOString().slice(0, 16) : ""}
                            onChange={(e) => patchField(item._id, "scheduledPublishAt", e.target.value)}
                          />
                        )}

                        <div className="row">
                          <button className="btn ghost small-btn" type="button" onClick={() => moveLesson(group, index, -1)}>
                            Move Up
                          </button>
                          <button className="btn ghost small-btn" type="button" onClick={() => moveLesson(group, index, 1)}>
                            Move Down
                          </button>
                        </div>

                        <div className="row">
                          <button className="btn" type="button" disabled={busy} onClick={() => saveItem(item)}>
                            {savingId === item._id ? "Saving..." : "Save"}
                          </button>
                          <button className="btn ghost danger" type="button" disabled={busy} onClick={() => deleteItem(item)}>
                            {deletingId === item._id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </section>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>

        <aside className="manage-sidebar">
          <div className="card side-panel">
            <div className="section-header">
              <div>
                <p className="eyebrow">Publishing Calendar</p>
                <h3>Scheduled releases</h3>
              </div>
            </div>
            {!scheduledItems.length ? (
              <EmptyState title="No scheduled lessons" text="Switch a playlist to scheduled to see upcoming releases here." />
            ) : (
              <div className="side-list">
                {scheduledItems.map((item) => (
                  <div key={item._id} className="side-list-item">
                    <strong>{item.title}</strong>
                    <span>{item.scheduledPublishAt ? new Date(item.scheduledPublishAt).toLocaleString() : "Pending date"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card side-panel">
            <div className="section-header">
              <div>
                <p className="eyebrow">Recently Uploaded</p>
                <h3>Fresh content</h3>
              </div>
            </div>
            <div className="feature-strip vertical-strip">
              {recentItems.map((item) => (
                <div key={item._id} className="feature-tile compact-feature">
                  <div className="feature-thumb" />
                  <div>
                    <strong>{item.title}</strong>
                    <p className="subtle-text">{item.topicTitle || "Untitled Playlist"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card side-panel">
            <div className="section-header">
              <div>
                <p className="eyebrow">Upload Tips</p>
                <h3>Best practices</h3>
              </div>
            </div>
            <div className="side-list">
              <div className="side-list-item">
                <strong>Lead with clarity</strong>
                <span>Use short summaries so learners know what each lesson unlocks.</span>
              </div>
              <div className="side-list-item">
                <strong>Schedule in batches</strong>
                <span>Spacing out releases keeps students returning to your course.</span>
              </div>
              <div className="side-list-item">
                <strong>Tag your topics</strong>
                <span>Better tags make discovery and filtering feel more intentional.</span>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
