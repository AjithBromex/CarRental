export function Spinner({ large }) {
  return <span className={`spinner ${large ? 'lg' : ''}`} aria-hidden="true" />
}

export function PageLoader({ label = 'Loading' }) {
  return (
    <div className="center-pad">
      <Spinner large />
      <span>{label}</span>
    </div>
  )
}

export function SkeletonStats({ count = 4 }) {
  return (
    <div className="stat-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height: 116 }} />
      ))}
    </div>
  )
}

export function SkeletonRows({ rows = 5, height = 56 }) {
  return (
    <div className="stack" style={{ gap: 8, padding: 16 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height }} />
      ))}
    </div>
  )
}

export function SkeletonCards({ count = 6 }) {
  return (
    <div className="vehicle-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height: 300, borderRadius: 'var(--r-lg)' }} />
      ))}
    </div>
  )
}
