import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="center-pad">
      <span className="plate lg">404</span>
      <h2>That page doesn't exist</h2>
      <p style={{ color: 'var(--muted)' }}>The link may be old, or the record was deleted.</p>
      <Link to="/" className="btn btn-primary">
        Back to the dashboard
      </Link>
    </div>
  )
}
