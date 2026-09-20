import { Link } from 'react-router-dom'
import { Pencil, Trash2, IndianRupee } from 'lucide-react'
import StatusBadge from './StatusBadge'
import Plate from './Plate'
import { inr, fmtDate } from '../utils/format'
import { paymentStatus } from '../utils/analytics'

export default function RentalTable({
  rentals,
  highlightId,
  onEdit,
  onDelete,
  onStatusChange,
  onCollect,
  hideVehicle,
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {!hideVehicle && <th>Vehicle</th>}
            <th>Driver</th>
            <th>Where</th>
            <th>Dates</th>
            <th className="right">Days</th>
            <th className="right">Total</th>
            <th className="right">Paid</th>
            <th className="right">Balance</th>
            <th>Damage (Description)</th>
            <th>Payment</th>
            <th>Rental</th>
            <th className="right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rentals.map((r) => {
            const balance = Math.max(0, (r.totalAmount || 0) - (r.amountPaid || 0))
            return (
              <tr
                key={r.id}
                style={highlightId === r.id ? { background: 'var(--amber-soft)' } : undefined}
              >
                {!hideVehicle && (
                  <td>
                    <Link to={`/vehicles/${r.vehicleId}`} className="cell-title" style={{ textDecoration: 'underline', textDecorationColor: 'var(--line)' }}>
                      {r.vehicleName}
                    </Link>
                    <span className="cell-sub">
                      <Plate number={r.registrationNumber} />
                    </span>
                  </td>
                )}
                <td>
                  <span className="cell-title">{r.driverName}</span>
                  <span className="cell-sub">{r.phoneNumber}</span>
                </td>
                <td>{r.location || '—'}</td>
                <td>
                  <span className="cell-title">{fmtDate(r.startDate)}</span>
                  <span className="cell-sub">to {fmtDate(r.endDate)}</span>
                </td>
                <td className="right num">{r.days}</td>
                <td className="right num">{inr(r.totalAmount)}</td>
                <td className="right num" style={{ color: 'var(--green)' }}>
                  {inr(r.amountPaid)}
                </td>
                <td className="right num" style={{ color: balance > 0 ? 'var(--red)' : 'var(--muted)' }}>
                  {inr(balance)}
                </td>
                <td>
                  {r.damageCost > 0 || r.damageDescription ? (
                    <div style={{ maxWidth: 190 }}>
                      {r.damageCost > 0 && (
                        <div style={{ fontWeight: 600, color: 'var(--amber)', fontSize: '0.84rem' }}>
                          ₹{Number(r.damageCost).toLocaleString('en-IN')}
                        </div>
                      )}
                      <div
                        className="cell-sub"
                        style={{
                          fontSize: '0.78rem',
                          color: 'var(--muted)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={r.damageDescription || 'Incident reported'}
                      >
                        {r.damageDescription || 'Incident reported'}
                      </div>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--faint)', fontSize: '0.85rem' }}>—</span>
                  )}
                </td>
                <td>
                  <StatusBadge kind="payment" status={paymentStatus(r)} />
                </td>
                <td>
                  {onStatusChange ? (
                    <select
                      className="select"
                      style={{ height: 32, fontSize: '0.82rem', minWidth: 118 }}
                      value={r.status}
                      onChange={(e) => onStatusChange(r, e.target.value)}
                      aria-label={`Rental status for ${r.driverName}`}
                    >
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  ) : (
                    <StatusBadge kind="rental" status={r.status} />
                  )}
                </td>
                <td>
                  <div className="row-actions">
                    {onCollect && balance > 0 && (
                      <button className="icon-btn ghost" style={{ width: 30, height: 30 }} onClick={() => onCollect(r)} aria-label="Record payment">
                        <IndianRupee size={14} />
                      </button>
                    )}
                    {onEdit && (
                      <button className="icon-btn ghost" style={{ width: 30, height: 30 }} onClick={() => onEdit(r)} aria-label="Edit rental">
                        <Pencil size={14} />
                      </button>
                    )}
                    {onDelete && (
                      <button className="icon-btn ghost" style={{ width: 30, height: 30 }} onClick={() => onDelete(r)} aria-label="Delete rental">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
