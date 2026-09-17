import { useNavigate } from 'react-router-dom'
import { Pencil, Trash2, Plus } from 'lucide-react'
import StatusBadge from './StatusBadge'
import Plate from './Plate'
import { inr, num } from '../utils/format'

export default function VehicleTable({ vehicles, onEdit, onDelete }) {
  const navigate = useNavigate()

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Vehicle</th>
            <th>Plate</th>
            <th>Status</th>
            <th className="right">Rentals</th>
            <th className="right">Days</th>
            <th className="right">Revenue</th>
            <th className="right">Pending</th>
            <th className="right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {vehicles.map((v) => (
            <tr key={v.id} className="clickable" onClick={() => navigate(`/vehicles/${v.id}`)}>
              <td>
                <span className="cell-title">{v.name}</span>
                <span className="cell-sub">
                  {v.model || v.type} · {v.year}
                </span>
              </td>
              <td>
                <Plate number={v.registrationNumber} />
              </td>
              <td>
                <StatusBadge kind="vehicle" status={v.status} />
              </td>
              <td className="right num">{num(v.stats.rentals)}</td>
              <td className="right num">{num(v.stats.days)}</td>
              <td className="right num">{inr(v.stats.revenue)}</td>
              <td className="right num" style={{ color: v.stats.balance > 0 ? 'var(--red)' : 'var(--muted)' }}>
                {inr(v.stats.balance)}
              </td>
              <td onClick={(e) => e.stopPropagation()}>
                <div className="row-actions">
                  {v.status === 'available' && (
                    <button
                      className="btn btn-sm btn-primary"
                      style={{ padding: '3px 8px', height: 26, fontSize: '0.78rem' }}
                      onClick={() => navigate(`/rentals/new?vehicle=${v.id}`)}
                      title={`Rent ${v.name}`}
                    >
                      <Plus size={12} /> Rent
                    </button>
                  )}
                  <button className="icon-btn ghost" style={{ width: 30, height: 30 }} onClick={() => onEdit(v)} aria-label={`Edit ${v.name}`}>
                    <Pencil size={14} />
                  </button>
                  <button className="icon-btn ghost" style={{ width: 30, height: 30 }} onClick={() => onDelete(v)} aria-label={`Delete ${v.name}`}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
