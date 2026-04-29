export default function SkeletonCard({ lines = 3 }) {
  return (
    <div className="card skeleton-card">
      <div className="skeleton-block skeleton-title" />
      {Array.from({ length: lines }).map((_, index) => (
        <div key={index} className="skeleton-block" />
      ))}
    </div>
  );
}
