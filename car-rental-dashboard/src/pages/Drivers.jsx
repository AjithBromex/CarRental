import { useMemo, useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Users, Phone, MapPin, ChevronDown } from 'lucide-react'
import { useData } from '../context/DataContext'
import SearchBar from '../components/SearchBar'
import EmptyState from '../components/EmptyState'
import StatCard from '../components/StatCard'
import RentalTable from '../components/RentalTable'
import { SkeletonRows } from '../components/Loading'
import { buildDrivers } from '../utils/analytics'
import { inr, num, fmtDate, initials, phoneDigits } from '../utils/format'

export default function Drivers() {
  const { rentals, loading } = useData()
  const [params] = useSearchParams()
  const [term, setTerm] = useState(params.get('q') || '')
  const [sort, setSort] = useState('recent')
  const [open, setOpen] = useState(null)

  useEffect(() => {
    const q = params.get('q')
    if (q) setTerm(q)
  }, [params])

  const drivers = useMemo(() => buildDrivers(rentals), [rentals])

  const list = useMemo(() => {
    const q = term.trim().toLowerCase()
    const digits = phoneDigits(q)
    const filtered = drivers.filter(
      (d) =>
        !q ||
        d.name?.toLowerCase().includes(q) ||
        d.locations.some((l) => l.toLowerCase().includes(q)) ||
        d.vehicles.some((v) => v.toLowerCase().includes(q)) ||
        (digits.length >= 3 && phoneDigits(d.phone).includes(digits))
    )
    const sorters = {
      recent: (a, b) => (b.lastRentalAt || 0) - (a.lastRentalAt || 0),
      spend: (a, b) => b.total - a.total,
      trips: (a, b) => b.rentals.length - a.rentals.length,
      owing: (a, b) => b.balance - a.balance,
      name: (a, b) => (a.name || '').localeCompare(b.name || ''),
    }
    return [...filtered].sort(sorters[sort])
  }, [drivers, term, sort])

  const totalOwed = drivers.reduce((t, d) => t + d.balance, 0)
  const repeat = drivers.filter((d) => d.rentals.length > 1).length

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Drivers</h1>
          <p>Everyone who has rented from you, grouped by phone number</p>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard icon={Users} label="Customers" value={num(drivers.length)} foot={`${num(repeat)} have come back`} accent="var(--amber)" accentSoft="var(--amber-soft)" />
        <StatCard label="Repeat rate" value={`${drivers.length ? ((repeat / drivers.length) * 100).toFixed(0) : 0}%`} foot="Booked more than once" accent="var(--blue)" accentSoft="var(--blue-soft)" />
        <StatCard label="Lifetime billed" value={inr(drivers.reduce((t, d) => t + d.total, 0))} accent="var(--green)" accentSoft="var(--green-soft)" />
        <StatCard label="Owed by customers" value={inr(totalOwed)} foot={`${drivers.filter((d) => d.balance > 0).length} still owe money`} accent="var(--red)" accentSoft="var(--red-soft)" />
      </div>

      <div className="filters">
        <SearchBar value={term} onChange={setTerm} placeholder="Search name, phone number, place or vehicle" />
        <select className="select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort drivers">
          <option value="recent">Most recent</option>
          <option value="spend">Biggest spenders</option>
          <option value="trips">Most rentals</option>
          <option value="owing">Owes the most</option>
          <option value="name">Name A–Z</option>
        </select>
      </div>

      {loading ? (
        <div className="panel">
          <SkeletonRows rows={5} height={72} />
        </div>
      ) : list.length === 0 ? (
        <section className="panel">
          <EmptyState
            icon={Users}
            title={drivers.length ? 'No one matches that search' : 'No customers yet'}
            body={
              drivers.length
                ? 'Try part of a name, a phone number or a place.'
                : 'Driver details are saved with every rental you record, and collect here automatically.'
            }
          />
        </section>
      ) : (
        <div className="stack" style={{ gap: 12 }}>
          {list.map((d) => {
            const isOpen = open === d.key
            return (
              <section className="panel" key={d.key}>
                <button
                  className="panel-head"
                  style={{ width: '100%', background: 'none', border: 0, borderBottom: isOpen ? '1px solid var(--line)' : 0, cursor: 'pointer', textAlign: 'left' }}
                  onClick={() => setOpen(isOpen ? null : d.key)}
                  aria-expanded={isOpen}
                >
                  <div className="row" style={{ gap: 12, minWidth: 0 }}>
                    <span className="avatar">{initials(d.name)}</span>
                    <div style={{ minWidth: 0 }}>
                      <h3>{d.name}</h3>
                      <p className="sub">
                        <Phone size={11} style={{ verticalAlign: -1 }} /> {d.phone || 'no number'} ·{' '}
                        <MapPin size={11} style={{ verticalAlign: -1 }} /> {d.locations.slice(0, 2).join(', ') || '—'}
                      </p>
                    </div>
                  </div>

                  <div className="row" style={{ gap: 20 }}>
                    <div style={{ textAlign: 'right' }}>
                      <span className="cell-sub">Rentals</span>
                      <strong className="num" style={{ display: 'block' }}>{d.rentals.length}</strong>
                    </div>
                    <div style={{ textAlign: 'right' }} className="desktop-only">
                      <span className="cell-sub">Days</span>
                      <strong className="num" style={{ display: 'block' }}>{d.days}</strong>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="cell-sub">Billed</span>
                      <strong className="num" style={{ display: 'block' }}>{inr(d.total)}</strong>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="cell-sub">Owes</span>
                      <strong className="num" style={{ display: 'block', color: d.balance > 0 ? 'var(--red)' : 'var(--green)' }}>
                        {inr(d.balance)}
                      </strong>
                    </div>
                    <ChevronDown size={18} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s', color: 'var(--muted)' }} />
                  </div>
                </button>

                {isOpen && (
                  <>
                    <div className="panel-body" style={{ paddingBottom: 0 }}>
                      <p className="hint">
                        First rented {fmtDate(d.rentals[d.rentals.length - 1]?.startDate)} · last rented{' '}
                        {fmtDate(d.rentals[0]?.startDate)} · vehicles used: {d.vehicles.join(', ') || '—'}
                      </p>
                    </div>
                    <RentalTable rentals={d.rentals} />
                  </>
                )}
              </section>
            )
          })}
        </div>
      )}
    </>
  )
}
