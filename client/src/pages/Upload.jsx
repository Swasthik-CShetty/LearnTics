import { useState } from "react";
import api from "../api/axios";

export default function Upload() {
  const [form, setForm] = useState({
    title: "",
    topicTitle: "",
    description: "",
    notes: "",
    pdfUrl: "",
    thumbnail: "",
  });
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!video) {
      alert("Please select a video file");
      return;
    }

    setLoading(true);
    try {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => payload.append(key, value));
      payload.append("video", video);

      await api.post("/reels/upload", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      alert("Reel uploaded successfully");
      setForm({
        title: "",
        topicTitle: "",
        description: "",
        notes: "",
        pdfUrl: "",
        thumbnail: "",
      });
      setVideo(null);
    } catch (err) {
      if (err.response?.status === 403) {
        alert("Your teacher account is pending admin verification.");
      } else {
        alert(err.response?.data?.message || "Upload failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <form className="card form-card" onSubmit={submit}>
        <h1>Upload Reel</h1>
        <p className="subtle-text">Add short, focused lessons your students can watch quickly.</p>
        <input
          required
          placeholder="Reel Title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <input
          required
          placeholder="Topic Title"
          value={form.topicTitle}
          onChange={(e) => setForm({ ...form, topicTitle: e.target.value })}
        />
        <textarea
          placeholder="Topic Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <textarea
          placeholder="Notes"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
        <input
          placeholder="PDF URL (optional)"
          value={form.pdfUrl}
          onChange={(e) => setForm({ ...form, pdfUrl: e.target.value })}
        />
        <input
          placeholder="Thumbnail URL (optional)"
          value={form.thumbnail}
          onChange={(e) => setForm({ ...form, thumbnail: e.target.value })}
        />
        <input type="file" accept="video/*" onChange={(e) => setVideo(e.target.files?.[0] || null)} />
        <button className="btn" disabled={loading}>
          {loading ? "Uploading..." : "Upload"}
        </button>
      </form>
    </div>
  );
}
