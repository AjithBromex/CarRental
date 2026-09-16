import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ClipboardList, Plus, Download } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import RentalTable from '../components/RentalTable'
import SearchBar from '../components/SearchBar'
import EmptyState from '../components/EmptyState'
import ConfirmDialog from '../components/ConfirmDialog'
import StatCard from '../components/StatCard'
import { SkeletonRows } from '../components/Loading'
import { setRentalStatus, deleteRental } from '../services/rentalService'
import { paymentStatus, countsAsBusiness } from '../utils/analytics'
import { inr, num, toDate, phoneDigits, fmtDate } from '../utils/format'

const inRange = (date, range) => {
  if (range === 'all') return true
  const d = toDate(date)
  if (!d) return false
  const now = new Date()
  const days = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 }[range]
  return (now - d) / 86400000 <= days
}

export default function Rentals() {
  const { rentals, vehicles, loading } = useData()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [term, setTerm] = useState('')
  const [vehicleId, setVehicleId] = useState('all')
  const [range, setRange] = useState('all')
  const [pay, setPay] = useState('all')
  const [toDeleteRental, setToDeleteRental] = useState(null)

  const status = params.get('status') || 'all'
  const highlight = params.get('highlight')

  const list = useMemo(() => {
    const q = term.trim().toLowerCase()
    const digits = phoneDigits(q)
    return rentals
      .filter((r) => (status === 'all' ? true : r.status === status))
      .filter((r) => (vehicleId === 'all' ? true : r.vehicleId === vehicleId))
      .filter((r) => (pay === 'all' ? true : paymentStatus(r) === pay))
      .filter((r) => inRange(r.startDate, range))
      .filter(
        (r) =>
          !q ||
          r.driverName?.toLowerCase().includes(q) ||
          r.vehicleName?.toLowerCase().includes(q) ||
          r.registrationNumber?.toLowerCase().includes(q) ||
          r.location?.toLowerCase().includes(q) ||
          (digits.length >= 3 && phoneDigits(r.phoneNumber).includes(digits))
      )
  }, [rentals, term, status, vehicleId, pay, range])

  const shown = useMemo(() => {
    const live = list.filter(countsAsBusiness)
    const total = live.reduce((t, r) => t + (Number(r.totalAmount) || 0), 0)
    const paid = live.reduce((t, r) => t + (Number(r.amountPaid) || 0), 0)
    return {
      count: list.length,
      days: live.reduce((t, r) => t + (Number(r.days) || 0), 0),
      total,
      paid,
      balance: Math.max(0, total - paid),
    }
  }, [list])

  const changeStatus = async (rental, next) => {
    try {
      await setRentalStatus(rental, next)
      toast(
        next === 'active'
          ? `${rental.vehicleName} marked as on rent`
          : next === 'completed'
          ? `${rental.vehicleName} is back and available`
          : 'Rental cancelled'
      )
    } catch (e) {
      toast(`Couldn't update: ${e.message}`, 'error')
    }
  }

  const exportCsv = () => {
    const head = ['Vehicle', 'Plate', 'Driver', 'Phone', 'Location', 'Start', 'End', 'Days', 'Total', 'Paid', 'Balance', 'Status']
    const rows = list.map((r) => [
      r.vehicleName,
      r.registrationNumber,
      r.driverName,
      r.phoneNumber,
      r.location,
      fmtDate(r.startDate),
      fmtDate(r.endDate),
      r.days,
      r.totalAmount,
      r.amountPaid,
      Math.max(0, (r.totalAmount || 0) - (r.amountPaid || 0)),
      r.status,
    ])
    const csv = [head, ...rows].map((line) => line.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `rentals-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast(`Exported ${rows.length} rental${rows.length === 1 ? '' : 's'}`)
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Rentals</h1>
          <p>Every rental you've recorded, newest first</p>
        </div>
        <div className="head-actions">
          <button className="btn" onClick={exportCsv} disabled={!list.length}>
            <Download size={15} /> Export CSV
          </button>
          <Link to="/rentals/new" className="btn btn-primary">
            <Plus size={15} /> Record rental
          </Link>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard label="Rentals shown" value={num(shown.count)} foot={`${num(shown.days)} rental days`} accent="var(--amber)" accentSoft="var(--amber-soft)" />
        <StatCard label="Billed" value={inr(shown.total)} accent="var(--blue)" accentSoft="var(--blue-soft)" />
        <StatCard label="Collected" value={inr(shown.paid)} accent="var(--green)" accentSoft="var(--green-soft)" />
        <StatCard label="Outstanding" value={inr(shown.balance)} accent="var(--red)" accentSoft="var(--red-soft)" />
      </div>

      <div className="filters">
        <SearchBar value={term} onChange={setTerm} placeholder="Search driver, phone, vehicle, plate or place" />
        <select className="select" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} aria-label="Filter by vehicle">
          <option value="all">Any vehicle</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
        <select
          className="select"
          value={status}
          onChange={(e) => {
            const next = new URLSearchParams(params)
            e.target.value === 'all' ? next.delete('status') : next.set('status', e.target.value)
            setParams(next, { replace: true })
          }}
          aria-label="Filter by rental status"
        >
          <option value="all">Any rental status</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select className="select" value={pay} onChange={(e) => setPay(e.target.value)} aria-label="Filter by payment status">
          <option value="all">Any payment</option>
          <option value="paid">Fully paid</option>
          <option value="partial">Part paid</option>
          <option value="pending">Unpaid</option>
        </select>
        <select className="select" value={range} onChange={(e) => setRange(e.target.value)} aria-label="Filter by date">
          <option value="all">All time</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 3 months</option>
          <option value="365d">Last year</option>
        </select>
      </div>

      <section className="panel">
        {loading ? (
          <SkeletonRows rows={6} />
        ) : list.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={rentals.length ? 'No rentals match those filters' : 'No rentals recorded yet'}
            body={
              rentals.length
                ? 'Widen the date range or clear the search to see more.'
                : 'Record a rental and this page becomes your full history, with payment status on every row.'
            }
            actionLabel={rentals.length ? undefined : 'Record your first rental'}
            actionTo={rentals.length ? undefined : '/rentals/new'}
          />
        ) : (
          <RentalTable
            rentals={list}
            highlightId={highlight}
            onStatusChange={changeStatus}
            onEdit={(r) => navigate(`/rentals/edit/${r.id}`)}
            onDelete={setToDeleteRental}
          />
        )}
      </section>

      <ConfirmDialog
        open={Boolean(toDeleteRental)}
        danger
        title="Delete this rental?"
        body={`The rental for ${toDeleteRental?.driverName} on ${toDeleteRental?.vehicleName} will be removed and its revenue taken out of your analytics.`}
        confirmLabel="Delete rental"
        onCancel={() => setToDeleteRental(null)}
        onConfirm={async () => {
          try {
            await deleteRental(toDeleteRental)
            toast('Rental deleted')
          } catch (e) {
            toast(`Couldn't delete: ${e.message}`, 'error')
          } finally {
            setToDeleteRental(null)
          }
        }}
      />
    </>
  )
}
