export default function EmptyState({ title, text, action = null }) {
  return (
    <div className="empty-state card">
      <h3>{title}</h3>
      <p className="subtle-text">{text}</p>
      {action}
    </div>
  );
}
