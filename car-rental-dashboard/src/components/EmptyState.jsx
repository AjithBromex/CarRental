import { Link } from 'react-router-dom'

export default function EmptyState({ icon: Icon, title, body, actionLabel, actionTo, onAction }) {
  return (
    <div className="empty">
      {Icon && (
        <span className="empty-icon">
          <Icon size={22} />
        </span>
      )}
      <h3>{title}</h3>
      {body && <p>{body}</p>}
      {actionLabel && actionTo && (
        <Link to={actionTo} className="btn btn-primary btn-sm" style={{ marginTop: 10 }}>
          {actionLabel}
        </Link>
      )}
      {actionLabel && onAction && !actionTo && (
        <button className="btn btn-sm" style={{ marginTop: 10 }} onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}
