import { Link, useNavigate } from 'react-router-dom'
import { BarChart3, Pencil, Trash2, Plus } from 'lucide-react'
import StatusBadge from './StatusBadge'
import Plate from './Plate'
import { inrShort, num } from '../utils/format'

export default function VehicleCard({ vehicle, onEdit, onDelete }) {
  const navigate = useNavigate()
  const s = vehicle.stats || { rentals: 0, days: 0, revenue: 0, balance: 0 }

  return (
    <article
      className="vcard"
      onClick={() => navigate(`/vehicles/${vehicle.id}`)}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/vehicles/${vehicle.id}`)}
    >
      <div className="vcard-media">
        {vehicle.image ? (
          <img src={vehicle.image} alt={vehicle.name} loading="lazy" decoding="async" />
        ) : (
          <span className="fallback">{vehicle.name?.[0] || '?'}</span>
        )}
        <StatusBadge kind="vehicle" status={vehicle.status} />
      </div>

      <div className="vcard-body">
        <div className="vcard-title">
          <div>
            <strong>{vehicle.name}</strong>
            <small>
              {vehicle.model || vehicle.type} · {vehicle.year}
            </small>
          </div>
          <Plate number={vehicle.registrationNumber} />
        </div>

        <div className="metrics">
          <div className="metric">
            <small>Rentals</small>
            <strong>{num(s.rentals)}</strong>
          </div>
          <div className="metric">
            <small>Days out</small>
            <strong>{num(s.days)}</strong>
          </div>
          <div className="metric">
            <small>Earned</small>
            <strong>{inrShort(s.revenue)}</strong>
          </div>
        </div>

        <div className="vcard-foot" onClick={(e) => e.stopPropagation()}>
          {vehicle.status === 'available' ? (
            <Link to={`/rentals/new?vehicle=${vehicle.id}`} className="btn btn-sm btn-primary" style={{ flex: 1 }}>
              <Plus size={14} /> Rent
            </Link>
          ) : (
            <Link to={`/vehicles/${vehicle.id}`} className="btn btn-sm" style={{ flex: 1 }}>
              <BarChart3 size={14} /> Analytics
            </Link>
          )}
          {vehicle.status === 'available' && (
            <Link to={`/vehicles/${vehicle.id}`} className="icon-btn" style={{ width: 34, height: 32 }} title="Analytics" aria-label={`View analytics for ${vehicle.name}`}>
              <BarChart3 size={14} />
            </Link>
          )}
          <button className="icon-btn" style={{ width: 34, height: 32 }} onClick={() => onEdit(vehicle)} aria-label={`Edit ${vehicle.name}`}>
            <Pencil size={14} />
          </button>
          <button className="icon-btn" style={{ width: 34, height: 32 }} onClick={() => onDelete(vehicle)} aria-label={`Delete ${vehicle.name}`}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </article>
  )
}
