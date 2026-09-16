import { inr } from '../utils/format'

/** Revenue split into collected vs outstanding, as one bar plus a legend. */
export default function PaymentCard({ revenue, paid, pending, compact }) {
  const pct = revenue ? (paid / revenue) * 100 : 0

  return (
    <div>
      <div className="split-bar" role="img" aria-label={`${pct.toFixed(0)} percent collected`}>
        <span style={{ width: `${pct}%`, background: 'var(--green)' }} />
        <span style={{ width: `${100 - pct}%`, background: 'var(--red)' }} />
      </div>
      <div className="legend">
        <div className="legend-item">
          <span className="swatch" style={{ background: 'var(--green)' }} />
          <div>
            <small>Collected</small>
            <strong>{inr(paid)}</strong>
          </div>
        </div>
        <div className="legend-item">
          <span className="swatch" style={{ background: 'var(--red)' }} />
          <div>
            <small>Still owed</small>
            <strong>{inr(pending)}</strong>
          </div>
        </div>
        {!compact && (
          <div className="legend-item">
            <span className="swatch" style={{ background: 'var(--surface-3)' }} />
            <div>
              <small>Billed</small>
              <strong>{inr(revenue)}</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
