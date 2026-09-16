export default function StatCard({ icon: Icon, label, value, foot, accent = 'var(--amber)', accentSoft = 'var(--amber-soft)' }) {
  return (
    <article className="stat" style={{ '--accent': accent, '--accent-soft': accentSoft }}>
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        {Icon && (
          <span className="stat-icon">
            <Icon size={16} />
          </span>
        )}
      </div>
      <span className="stat-value">{value}</span>
      {foot && <span className="stat-foot">{foot}</span>}
    </article>
  )
}
