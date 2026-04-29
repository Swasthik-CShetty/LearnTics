import { useState } from "react";
import api from "../api/axios";
import { useToast } from "../components/ToastProvider";

const createEmptyForm = () => ({
  title: "",
  topicTitle: "",
  description: "",
  notes: "",
  pdfUrl: "",
  thumbnail: "",
  coverImage: "",
  category: "",
  level: "",
  estimatedMinutes: "",
  tags: "",
  learningObjectives: "",
  summary: "",
  status: "published",
  scheduledPublishAt: "",
  durationSeconds: "",
});

const stripExtension = (fileName = "") => fileName.replace(/\.[^/.]+$/, "");

export default function Upload() {
  const [mode, setMode] = useState("single");
  const [form, setForm] = useState(createEmptyForm());
  const [video, setVideo] = useState(null);
  const [lectureDraft, setLectureDraft] = useState({ title: "", video: null });
  const [courseLessons, setCourseLessons] = useState([]);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const resetForm = () => {
    setForm(createEmptyForm());
    setVideo(null);
    setLectureDraft({ title: "", video: null });
    setCourseLessons([]);
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setVideo(null);
    setLectureDraft({ title: "", video: null });
    setCourseLessons([]);
  };

  const addLecture = () => {
    const title = lectureDraft.title.trim() || stripExtension(lectureDraft.video?.name || "");

    if (!lectureDraft.video) {
      showToast("Choose a video for the lecture first.", "warn");
      return;
    }

    if (!title) {
      showToast("Add a lecture title before adding it to the playlist.", "warn");
      return;
    }

    setCourseLessons((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${prev.length}`,
        title,
        video: lectureDraft.video,
      },
    ]);
    setLectureDraft({ title: "", video: null });
    showToast("Lecture added to the playlist.", "success");
  };

  const removeLecture = (lessonId) => {
    setCourseLessons((prev) => prev.filter((item) => item.id !== lessonId));
  };

  const updateCourseLecture = (lessonId, key, value) => {
    setCourseLessons((prev) =>
      prev.map((lesson) => (lesson.id === lessonId ? { ...lesson, [key]: value } : lesson))
    );
  };

  const submit = async (e) => {
    e.preventDefault();

    setLoading(true);
    try {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => payload.append(key, value));

      if (mode === "single") {
        if (!video) {
          showToast("Please select a video file.", "warn");
          setLoading(false);
          return;
        }

        payload.append("video", video);

        await api.post("/reels/upload", payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        showToast("Lesson uploaded successfully.", "success");
      } else {
        if (!courseLessons.length) {
          showToast("Add at least one lecture before publishing the playlist.", "warn");
          setLoading(false);
          return;
        }

        courseLessons.forEach((lesson) => {
          payload.append("videos", lesson.video);
        });
        payload.append(
          "lessonTitles",
          JSON.stringify(courseLessons.map((lesson) => lesson.title))
        );

        await api.post("/reels/upload-course", payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        showToast("Course playlist uploaded successfully.", "success");
      }

      resetForm();
    } catch (err) {
      if (err.response?.status === 403) {
        showToast("Your teacher account is pending admin verification.", "warn");
      } else {
        showToast(err.response?.data?.message || "Upload failed", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page page-stack">
      <section className="card hero-card upload-hero">
        <div className="hero-copy">
          <p className="eyebrow">Teacher Studio</p>
          <h1>
            {mode === "single"
              ? "Prepare a polished lesson"
              : "Build a playlist one lecture at a time"}
          </h1>
          <p className="subtle-text hero-text">
            Add lessons one by one, review the playlist as it grows, and publish when the full
            course is ready.
          </p>
          <div className="segmented-control">
            <button
              type="button"
              className={`btn ${mode === "single" ? "" : "ghost"}`}
              onClick={() => switchMode("single")}
            >
              Single Lesson
            </button>
            <button
              type="button"
              className={`btn ${mode === "course" ? "" : "ghost"}`}
              onClick={() => switchMode("course")}
            >
              Playlist Builder
            </button>
          </div>
        </div>
        <div className="hero-stats-grid">
          <div className="hero-stat-card">
            <span>Format</span>
            <strong>{mode === "single" ? "1 video" : `${courseLessons.length} lectures`}</strong>
          </div>
          <div className="hero-stat-card">
            <span>Status</span>
            <strong>{form.status}</strong>
          </div>
          <div className="hero-stat-card">
            <span>Tags</span>
            <strong>{form.tags ? form.tags.split(",").filter(Boolean).length : 0}</strong>
          </div>
          <div className="hero-stat-card">
            <span>Resources</span>
            <strong>{[form.pdfUrl, form.coverImage, form.thumbnail].filter(Boolean).length}</strong>
          </div>
        </div>
      </section>

      <section className="upload-layout">
        <form className="card form-card form-card-wide upload-main-card" onSubmit={submit}>
          <div className="form-section">
            <div className="section-header">
              <div>
                <p className="eyebrow">Core Details</p>
                <h2>Lesson identity</h2>
              </div>
            </div>
            <div className="input-grid">
              {mode === "single" && (
                <label className="field-label">
                  Lesson title
                  <input
                    required
                    placeholder="Introduction to photosynthesis"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </label>
              )}
              <label className="field-label">
                Playlist title
                <input
                  required
                  placeholder={mode === "single" ? "Biology basics" : "Complete biology course"}
                  value={form.topicTitle}
                  onChange={(e) => setForm({ ...form, topicTitle: e.target.value })}
                />
              </label>
              <label className="field-label field-wide">
                Topic description
                <textarea
                  placeholder="What learners will understand after this playlist"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </label>
              {mode === "single" && (
                <label className="field-label field-wide">
                  Lesson summary
                  <textarea
                    placeholder="A short recap shown with the lesson"
                    value={form.summary}
                    onChange={(e) => setForm({ ...form, summary: e.target.value })}
                  />
                </label>
              )}
              <label className="field-label field-wide">
                Teacher notes
                <textarea
                  placeholder="Helpful references, reminders, or classroom notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </label>
            </div>
          </div>

          <div className="form-section">
            <div className="section-header">
              <div>
                <p className="eyebrow">Discovery</p>
                <h2>Catalog information</h2>
              </div>
            </div>
            <div className="input-grid input-grid-compact">
              <label className="field-label">
                Category
                <input
                  placeholder="Science"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                />
              </label>
              <label className="field-label">
                Level
                <input
                  placeholder="Beginner"
                  value={form.level}
                  onChange={(e) => setForm({ ...form, level: e.target.value })}
                />
              </label>
              <label className="field-label">
                Estimated minutes
                <input
                  type="number"
                  min="0"
                  placeholder="12"
                  value={form.estimatedMinutes}
                  onChange={(e) => setForm({ ...form, estimatedMinutes: e.target.value })}
                />
              </label>
              <label className="field-label">
                Duration seconds
                <input
                  type="number"
                  min="0"
                  placeholder="720"
                  value={form.durationSeconds}
                  onChange={(e) => setForm({ ...form, durationSeconds: e.target.value })}
                />
              </label>
              <label className="field-label field-wide">
                Tags
                <input
                  placeholder="biology, cells, exam prep"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                />
              </label>
              <label className="field-label field-wide">
                Learning objectives
                <textarea
                  placeholder={"Explain the key idea\nApply it to a question\nReview common mistakes"}
                  value={form.learningObjectives}
                  onChange={(e) => setForm({ ...form, learningObjectives: e.target.value })}
                />
              </label>
            </div>
          </div>

          <div className="form-section">
            <div className="section-header">
              <div>
                <p className="eyebrow">Media</p>
                <h2>Assets and resources</h2>
              </div>
            </div>
            <div className="input-grid">
              <label className="field-label">
                PDF URL
                <input
                  placeholder="https://..."
                  value={form.pdfUrl}
                  onChange={(e) => setForm({ ...form, pdfUrl: e.target.value })}
                />
              </label>
              <label className="field-label">
                Cover image URL
                <input
                  placeholder="https://..."
                  value={form.coverImage}
                  onChange={(e) => setForm({ ...form, coverImage: e.target.value })}
                />
              </label>
              <label className="field-label field-wide">
                Thumbnail URL
                <input
                  placeholder="https://..."
                  value={form.thumbnail}
                  onChange={(e) => setForm({ ...form, thumbnail: e.target.value })}
                />
              </label>

              {mode === "single" ? (
                <label className="file-drop field-wide">
                  <span>{video ? video.name : "Choose a lesson video"}</span>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => setVideo(e.target.files?.[0] || null)}
                  />
                </label>
              ) : (
                <div className="field-wide upload-lesson-builder">
                  <div className="section-header">
                    <div>
                      <p className="eyebrow">Lecture Queue</p>
                      <h3>Add lectures one by one</h3>
                    </div>
                  </div>

                  <div className="upload-lesson-draft">
                    <label className="field-label">
                      Lecture title
                      <input
                        placeholder="Lesson 1: Cell structure"
                        value={lectureDraft.title}
                        onChange={(e) =>
                          setLectureDraft((prev) => ({ ...prev, title: e.target.value }))
                        }
                      />
                    </label>

                    <label className="file-drop">
                      <span>
                        {lectureDraft.video ? lectureDraft.video.name : "Choose the lecture video"}
                      </span>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) =>
                          setLectureDraft((prev) => ({
                            ...prev,
                            video: e.target.files?.[0] || null,
                          }))
                        }
                      />
                    </label>

                    <button type="button" className="btn" onClick={addLecture}>
                      Add Lecture
                    </button>
                  </div>

                  {!!courseLessons.length && (
                    <div className="upload-queue">
                      {courseLessons.map((lesson, index) => (
                        <div key={lesson.id} className="upload-queue-item">
                          <div className="upload-queue-item__main">
                            <strong>
                              {index + 1}. {lesson.title}
                            </strong>
                            <span>{lesson.video.name}</span>
                          </div>
                          <div className="upload-queue-item__actions">
                            <input
                              value={lesson.title}
                              onChange={(e) =>
                                updateCourseLecture(lesson.id, "title", e.target.value)
                              }
                              aria-label={`Edit title for lecture ${index + 1}`}
                            />
                            <button
                              type="button"
                              className="btn ghost danger small-btn"
                              onClick={() => removeLecture(lesson.id)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="form-section form-section-actions">
            <div className="input-grid input-grid-compact">
              <label className="field-label">
                Publishing state
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="published">Publish now</option>
                  <option value="draft">Save as draft</option>
                  <option value="scheduled">Schedule publishing</option>
                </select>
              </label>
              {form.status === "scheduled" && (
                <label className="field-label">
                  Publish date
                  <input
                    type="datetime-local"
                    value={form.scheduledPublishAt}
                    onChange={(e) => setForm({ ...form, scheduledPublishAt: e.target.value })}
                  />
                </label>
              )}
            </div>
            <button className="btn btn-wide" disabled={loading}>
              {loading
                ? "Uploading..."
                : mode === "single"
                  ? "Upload Lesson"
                  : "Publish Playlist"}
            </button>
          </div>
        </form>

        <aside className="upload-sidebar">
          <div className="card side-panel">
            <div className="section-header">
              <div>
                <p className="eyebrow">Quality Check</p>
                <h3>Before publishing</h3>
              </div>
            </div>
            <div className="side-list">
              <div className="side-list-item">
                <strong>Clear title</strong>
                <span>Make the promise of the lesson obvious.</span>
              </div>
              <div className="side-list-item">
                <strong>Specific outcomes</strong>
                <span>Objectives help students decide what to watch next.</span>
              </div>
              <div className="side-list-item">
                <strong>Useful metadata</strong>
                <span>Category, level, and tags make discovery feel intentional.</span>
              </div>
              {mode === "course" && (
                <div className="side-list-item">
                  <strong>Build the queue first</strong>
                  <span>
                    Add lectures one by one, review the list, then publish the complete playlist.
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="card side-panel upload-preview-card">
            <p className="eyebrow">Live Preview</p>
            <div className="feature-thumb preview-thumb" />
            <h3>{form.title || form.topicTitle || "Untitled lesson"}</h3>
            <p className="subtle-text">
              {form.category || "Category"} | {form.level || "Level"} | {form.estimatedMinutes || 0}{" "}
              min
            </p>
            <div className="chip-row">
              {(form.tags ? form.tags.split(",") : ["video", "lesson", "study"])
                .slice(0, 4)
                .map((tag) => (
                  <span key={tag.trim()} className="mini-chip">
                    {tag.trim()}
                  </span>
                ))}
            </div>
            {mode === "course" && (
              <div className="upload-preview-summary">
                <strong>{courseLessons.length} lectures queued</strong>
                <span className="subtle-text">
                  {courseLessons.length
                    ? `Next up: ${courseLessons[courseLessons.length - 1].title}`
                    : "Add the first lecture to begin the playlist."}
                </span>
              </div>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}
