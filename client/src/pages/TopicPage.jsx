import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/axios";
import Spinner from "../components/Spinner";

export default function TopicPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/topic/${id}`);
        setData(res.data);
      } catch (err) {
        alert(err.response?.data?.message || "Failed to load topic");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [id]);

  if (loading) {
    return (
      <div className="page centered">
        <Spinner />
      </div>
    );
  }

  if (!data) {
    return <div className="page centered">Topic not found.</div>;
  }

  const firstReel = data.reels?.[0];

  return (
    <div className="page topic-page">
      <div className="card topic-card">
        <h1>{data.topic.title}</h1>
        <p className="subtle-text">
          <strong>Teacher:</strong> {data.topic.teacherId?.name || "Unknown"}
        </p>
        {firstReel && <video src={firstReel.videoUrl} controls className="topic-video" />}
        {data.topic.description && (
          <>
            <h3>Description</h3>
            <p>{data.topic.description}</p>
          </>
        )}
        {data.topic.notes && (
          <>
            <h3>Notes</h3>
            <p>{data.topic.notes}</p>
          </>
        )}
        {data.topic.pdfUrl && (
          <p>
            <a href={data.topic.pdfUrl} target="_blank" rel="noreferrer">
              Open PDF
            </a>
          </p>
        )}
        <Link to="/feed" className="btn">
          Back to Feed
        </Link>
      </div>
    </div>
  );
}
