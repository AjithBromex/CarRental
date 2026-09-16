import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, PanelLeftClose, PanelLeft, Sun, Moon, Plus, Search, X } from 'lucide-react'
import Notifications from './Notifications'
import Plate from './Plate'
import { useTheme } from '../context/ThemeContext'
import { useData } from '../context/DataContext'
import { phoneDigits } from '../utils/format'

/** Search across vehicles, plates, drivers, phone numbers and locations. */
function useGlobalSearch(term) {
  const { vehicles, rentals } = useData()
  return useMemo(() => {
    const q = term.trim().toLowerCase()
    if (q.length < 2) return []
    const digits = phoneDigits(q)

    const vehicleHits = vehicles
      .filter(
        (v) =>
          v.name?.toLowerCase().includes(q) ||
          v.model?.toLowerCase().includes(q) ||
          v.registrationNumber?.toLowerCase().includes(q)
      )
      .slice(0, 4)
      .map((v) => ({
        id: `v-${v.id}`,
        title: v.name,
        sub: v.registrationNumber,
        plate: true,
        to: `/vehicles/${v.id}`,
      }))

    const seen = new Set()
    const driverHits = rentals
      .filter(
        (r) =>
          r.driverName?.toLowerCase().includes(q) ||
          r.location?.toLowerCase().includes(q) ||
          (digits.length >= 3 && phoneDigits(r.phoneNumber).includes(digits))
      )
      .filter((r) => {
        const key = r.phoneNumber || r.driverName
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .slice(0, 4)
      .map((r) => ({
        id: `d-${r.id}`,
        title: r.driverName,
        sub: `${r.phoneNumber} · ${r.location || 'no location'}`,
        to: `/drivers?q=${encodeURIComponent(r.phoneNumber || r.driverName)}`,
      }))

    return [...vehicleHits, ...driverHits]
  }, [term, vehicles, rentals])
}

export default function Navbar({ collapsed, onToggleCollapse, onOpenMobile }) {
  const { theme, toggle } = useTheme()
  const [term, setTerm] = useState('')
  const [focused, setFocused] = useState(false)
  const results = useGlobalSearch(term)
  const navigate = useNavigate()
  const boxRef = useRef(null)

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        boxRef.current?.querySelector('input')?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const go = (to) => {
    setTerm('')
    setFocused(false)
    navigate(to)
  }

  return (
    <header className="topbar">
      <button className="icon-btn ghost mobile-only" onClick={onOpenMobile} aria-label="Open menu">
        <Menu size={19} />
      </button>
      <button className="icon-btn ghost desktop-only" onClick={onToggleCollapse} aria-label="Collapse sidebar">
        {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
      </button>

      <div className="topbar-search topbar-pop" ref={boxRef}>
        <div className="search">
          <Search size={16} />
          <input
            className="input"
            value={term}
            placeholder="Search vehicles, plates, drivers, phone numbers"
            onChange={(e) => setTerm(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 140)}
            aria-label="Global search"
          />
          {term && (
            <button className="clear" onClick={() => setTerm('')} aria-label="Clear search">
              <X size={15} />
            </button>
          )}
        </div>

        {focused && term.trim().length >= 2 && (
          <div className="pop" style={{ left: 0, right: 'auto', width: '100%' }}>
            <div className="pop-list">
              {results.length === 0 ? (
                <p style={{ padding: '18px 14px', color: 'var(--muted)', fontSize: '0.86rem' }}>
                  No match for “{term}”.
                </p>
              ) : (
                results.map((r) => (
                  <button key={r.id} className="note" onClick={() => go(r.to)}>
                    <span style={{ minWidth: 0 }}>
                      <strong>{r.title}</strong>
                      {r.plate ? <Plate number={r.sub} /> : <span>{r.sub}</span>}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <div style={{ flex: 1 }} />

      <button className="btn btn-primary btn-sm desktop-only" onClick={() => navigate('/rentals/new')}>
        <Plus size={15} /> New rental
      </button>
      <Notifications />
      <button className="icon-btn" onClick={toggle} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
        {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
      </button>
    </header>
  )
}
