import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, AlertTriangle, Clock, IndianRupee, Car, Wrench } from 'lucide-react'
import { useData } from '../context/DataContext'

const ICONS = { alert: AlertTriangle, clock: Clock, money: IndianRupee, car: Car, wrench: Wrench }
const TONES = {
  red: { color: 'var(--red)', background: 'var(--red-soft)' },
  amber: { color: 'var(--amber)', background: 'var(--amber-soft)' },
  green: { color: 'var(--green)', background: 'var(--green-soft)' },
  blue: { color: 'var(--blue)', background: 'var(--blue-soft)' },
}

export default function Notifications() {
  const { notifications } = useData()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const onClick = (e) => !ref.current?.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const urgent = notifications.filter((n) => n.tone === 'red').length

  return (
    <div className="topbar-pop" ref={ref}>
      <button
        className="icon-btn"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Alerts (${notifications.length})`}
        aria-expanded={open}
      >
        <Bell size={17} />
        {urgent > 0 && <span className="dot">{urgent}</span>}
      </button>

      {open && (
        <div className="pop">
          <div className="pop-head">
            <h3 style={{ fontSize: '0.92rem' }}>Needs attention</h3>
            <span className="cell-sub">{notifications.length} items</span>
          </div>
          <div className="pop-list">
            {notifications.length === 0 ? (
              <p style={{ padding: '22px 14px', color: 'var(--muted)', fontSize: '0.86rem', textAlign: 'center' }}>
                Nothing to chase. Every rental is on time and paid up.
              </p>
            ) : (
              notifications.map((n) => {
                const Icon = ICONS[n.icon] || Bell
                return (
                  <button
                    key={n.id}
                    className="note"
                    onClick={() => {
                      setOpen(false)
                      navigate(n.to)
                    }}
                  >
                    <span className="note-icon" style={TONES[n.tone]}>
                      <Icon size={15} />
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <strong>{n.title}</strong>
                      <span>{n.body}</span>
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
