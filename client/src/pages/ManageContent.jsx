import { useEffect, useState } from "react";
import api from "../api/axios";
import Spinner from "../components/Spinner";

export default function ManageContent() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [notice, setNotice] = useState(null);

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
        }))
      );
      setNotice(null);
    } catch (err) {
      setNotice({
        type: "error",
        text: err.response?.data?.message || "Failed to load your uploads",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMyContent();
  }, []);

  const patchField = (id, key, value) => {
    setItems((prev) => prev.map((item) => (item._id === id ? { ...item, [key]: value } : item)));
  };

  const saveItem = async (item) => {
    setSavingId(item._id);
    setNotice(null);
    try {
      const { data } = await api.patch(`/reels/${item._id}`, {
        title: item.title,
        thumbnail: item.thumbnail || "",
        topicTitle: item.topicTitle,
        description: item.description || "",
        notes: item.notes || "",
        pdfUrl: item.pdfUrl || "",
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
              }
            : x
        )
      );
      setNotice({ type: "success", text: "Content updated successfully." });
    } catch (err) {
      setNotice({
        type: "error",
        text: err.response?.data?.message || "Could not save changes",
      });
    } finally {
      setSavingId("");
    }
  };

  const deleteItem = async (item) => {
    const ok = window.confirm(`Delete "${item.title}"? This cannot be undone.`);
    if (!ok) return;

    setDeletingId(item._id);
    setNotice(null);
    try {
      await api.delete(`/reels/${item._id}`);
      setItems((prev) => prev.filter((x) => x._id !== item._id));
      setNotice({ type: "success", text: "Content deleted successfully." });
    } catch (err) {
      setNotice({
        type: "error",
        text: err.response?.data?.message || "Could not delete content",
      });
    } finally {
      setDeletingId("");
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
        <h1>Manage Uploaded Content</h1>
        <p className="subtle-text">Edit details or delete your uploaded reels.</p>
        {notice && <div className={`notice notice-${notice.type}`}>{notice.text}</div>}

        {!items.length && <p>You have not uploaded any content yet.</p>}

        <div className="manage-grid">
          {items.map((item) => {
            const busy = savingId === item._id || deletingId === item._id;
            return (
              <section className="manage-card" key={item._id}>
                <h3>{item.title}</h3>
                <p className="muted">
                  Uploaded: {new Date(item.createdAt).toLocaleString()}
                </p>
                <video src={item.videoUrl} controls className="topic-video" />

                <input
                  placeholder="Reel Title"
                  value={item.title}
                  onChange={(e) => patchField(item._id, "title", e.target.value)}
                />
                <input
                  placeholder="Topic Title"
                  value={item.topicTitle}
                  onChange={(e) => patchField(item._id, "topicTitle", e.target.value)}
                />
                <textarea
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => patchField(item._id, "description", e.target.value)}
                />
                <textarea
                  placeholder="Notes"
                  value={item.notes}
                  onChange={(e) => patchField(item._id, "notes", e.target.value)}
                />
                <input
                  placeholder="PDF URL"
                  value={item.pdfUrl}
                  onChange={(e) => patchField(item._id, "pdfUrl", e.target.value)}
                />
                <input
                  placeholder="Thumbnail URL"
                  value={item.thumbnail || ""}
                  onChange={(e) => patchField(item._id, "thumbnail", e.target.value)}
                />

                <div className="row">
                  <button className="btn" type="button" disabled={busy} onClick={() => saveItem(item)}>
                    {savingId === item._id ? "Saving..." : "Save"}
                  </button>
                  <button
                    className="btn ghost danger"
                    type="button"
                    disabled={busy}
                    onClick={() => deleteItem(item)}
                  >
                    {deletingId === item._id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
