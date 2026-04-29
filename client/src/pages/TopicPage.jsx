import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import api from "../api/axios";
import EmptyState from "../components/EmptyState";
import SkeletonCard from "../components/SkeletonCard";
import { useToast } from "../components/ToastProvider";
import { getUser } from "../utils/auth";

export default function TopicPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const lessonRefs = useRef({});
  const videoRefs = useRef({});
  const user = getUser();
  const isStudent = user?.role === "student";
  const { showToast } = useToast();

  const loadTopic = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/topic/${id}`);
      setData(res.data);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to load topic", "error");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTopic();
  }, [id, searchParams]);

  useEffect(() => {
    if (!data?.reels?.length) return;

    const targetReelId = searchParams.get("reel") || data.reels[0]?._id;
    const target = lessonRefs.current[targetReelId];

    if (!target) return undefined;

    const frame = window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [data, searchParams]);

  const reportProgress = async (reelId, completed = false, watchedSeconds = 0) => {
    if (!isStudent) return;

    try {
      await api.post("/progress", {
        reelId,
        watchedSeconds,
        completed,
      });
    } catch (_error) {
      // Keep scrolling and playback smooth even if progress save fails.
    }
  };

  const advanceToNextLesson = (currentIndex) => {
    const nextReel = data?.reels?.[currentIndex + 1];
    if (!nextReel) return;

    const nextCard = lessonRefs.current[nextReel._id];
    const nextVideo = videoRefs.current[nextReel._id];

    nextCard?.scrollIntoView({ behavior: "smooth", block: "start" });

    window.requestAnimationFrame(() => {
      nextVideo?.play?.().catch(() => {});
    });
  };

  const toggleSave = async () => {
    try {
      const { data: response } = await api.post(`/saved-topics/${id}/toggle`);
      setData((prev) => ({
        ...prev,
        topic: {
          ...prev.topic,
          isSaved: response.saved,
        },
      }));
      showToast(response.message, "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Could not update saved playlist", "error");
    }
  };

  if (loading) {
    return (
      <div className="page">
        <SkeletonCard lines={5} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page centered">
        <EmptyState
          title="Topic not found"
          text="This playlist may have been removed or is not published yet."
        />
      </div>
    );
  }

  const completedLessons = data.topic.completion?.completedLessons || 0;
  const totalLessons = data.topic.completion?.totalLessons || data.reels.length || 0;
  const quickStats = [
    { label: "Completion", value: `${data.topic.completion?.percent || 0}%` },
    { label: "Lessons", value: totalLessons },
    { label: "Completed", value: completedLessons },
    { label: "Duration", value: `${data.topic.estimatedMinutes || 0} mins` },
  ];

  return (
    <div className="page page-stack">
      <section className="card hero-card topic-hero">
        <div className="hero-copy">
          <p className="eyebrow">Playlist Overview</p>
          <h1>{data.topic.title}</h1>
          <p className="subtle-text hero-text">
            {data.topic.description || "A focused lesson series designed to move from context to mastery."}
          </p>
          <div className="row">
            {isStudent && (
              <button type="button" className="btn" onClick={toggleSave}>
                {data.topic.isSaved ? "Saved Playlist" : "Save Playlist"}
              </button>
            )}
            <Link to="/feed" className="btn ghost">
              Back to Feed
            </Link>
          </div>
        </div>
        <div className="hero-stats-grid">
          {quickStats.map((item) => (
            <div key={item.label} className="hero-stat-card">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="topic-layout">
        <div className="topic-main">
          {data.topic.coverImage && (
            <img src={data.topic.coverImage} alt={data.topic.title} className="topic-cover" />
          )}

          <div className="card section-card topic-lesson-stream">
            <div className="section-header">
              <div>
                <p className="eyebrow">Lesson Stream</p>
                <h2>Scroll through the playlist one lesson at a time</h2>
              </div>
            </div>

            <div className="topic-lesson-list">
              {data.reels.map((reel, index) => (
                <section
                  key={reel._id}
                  ref={(el) => {
                    lessonRefs.current[reel._id] = el;
                  }}
                  className="topic-lesson-card"
                >
                  <div className="topic-lesson-media">
                    <video
                      ref={(el) => {
                        videoRefs.current[reel._id] = el;
                      }}
                      src={reel.videoUrl}
                      controls
                      playsInline
                      className="topic-video topic-lesson-video"
                      onEnded={async (e) => {
                        await reportProgress(
                          reel._id,
                          true,
                          Math.floor(e.currentTarget.currentTime || 0)
                        );
                        advanceToNextLesson(index);
                      }}
                    />
                  </div>

                  <div className="topic-lesson-copy">
                    <div className="section-header topic-header-row">
                      <div>
                        <p className="eyebrow">Lesson {reel.lessonOrder || index + 1}</p>
                        <h3>{reel.title}</h3>
                      </div>
                      {reel.progress?.completed ? (
                        <span className="badge-success">Completed</span>
                      ) : (
                        <span className="mini-chip">
                          {Math.floor(reel.progress?.watchedSeconds || 0)}s watched
                        </span>
                      )}
                    </div>

                    <p className="subtle-text">
                      {reel.summary ||
                        "Watch this lesson, then scroll to the next card to continue the sequence."}
                    </p>

                    {!!reel.topicId?.tags?.length && (
                      <div className="chip-row">
                        {reel.topicId.tags.slice(0, 4).map((tag) => (
                          <span key={tag} className="mini-chip">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="row topic-lesson-actions">
                      {index > 0 && (
                        <button
                          type="button"
                          className="btn ghost small-btn"
                          onClick={() => {
                            const previous = data.reels[index - 1];
                            lessonRefs.current[previous._id]?.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            });
                          }}
                        >
                          Previous lesson
                        </button>
                      )}
                      {index < data.reels.length - 1 && (
                        <button
                          type="button"
                          className="btn small-btn"
                          onClick={() => {
                            const next = data.reels[index + 1];
                            lessonRefs.current[next._id]?.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            });
                          }}
                        >
                          Next lesson
                        </button>
                      )}
                    </div>
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>

        <aside className="topic-sidebar">
          <div className="card side-panel">
            <div className="section-header">
              <div>
                <p className="eyebrow">Progress</p>
                <h3>{data.topic.completion?.badge || "In Progress"}</h3>
              </div>
            </div>
            <div className="topic-progress-banner">
              <span>{data.topic.completion?.percent || 0}% complete</span>
              <span>
                {completedLessons}/{totalLessons} lessons
              </span>
            </div>
          </div>

          <div className="card side-panel">
            <div className="section-header">
              <div>
                <p className="eyebrow">Teacher Profile</p>
                <h3>{data.topic.teacherId?.name || "Unknown"}</h3>
              </div>
            </div>
            <p className="subtle-text">
              {data.topic.category || "General"} | {data.topic.level || "All levels"}
            </p>
            {!!data.topic.tags?.length && (
              <div className="chip-row">
                {data.topic.tags.map((tag) => (
                  <span key={tag} className="mini-chip">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {!!data.topic.learningObjectives?.length && (
              <div className="side-list">
                {data.topic.learningObjectives.slice(0, 4).map((item) => (
                  <div key={item} className="side-list-item">
                    <strong>{item}</strong>
                    <span>Core learning objective</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {(data.topic.notes || data.topic.pdfUrl) && (
            <div className="card side-panel">
              <div className="section-header">
                <div>
                  <p className="eyebrow">Resources</p>
                  <h3>Support material</h3>
                </div>
              </div>
              {data.topic.notes && <p className="subtle-text">{data.topic.notes}</p>}
              {data.topic.pdfUrl && (
                <a href={data.topic.pdfUrl} target="_blank" rel="noreferrer" className="btn ghost">
                  Open PDF
                </a>
              )}
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}
