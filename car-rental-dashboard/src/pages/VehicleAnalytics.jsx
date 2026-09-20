import { useMemo, useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Pencil,
  Plus,
  CalendarDays,
  IndianRupee,
  Wallet,
  AlertCircle,
  Repeat,
  Timer,
  ClipboardList,
  Wrench,
  Coins,
  Trash2,
  TrendingUp,
} from 'lucide-react'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import StatCard from '../components/StatCard'
import ChartCard, { axisProps, chartColors, tooltipStyle } from '../components/ChartCard'
import StatusBadge from '../components/StatusBadge'
import Plate from '../components/Plate'
import PaymentCard from '../components/PaymentCard'
import RentalTable from '../components/RentalTable'
import EmptyState from '../components/EmptyState'
import ConfirmDialog from '../components/ConfirmDialog'
import { PageLoader, Spinner } from '../components/Loading'
import { monthlySeries, statsFor } from '../utils/analytics'
import {
  setVehicleStatus,
  addVehicleMaintenanceRecord,
  deleteVehicleMaintenanceRecord,
  setVehicleMaintenanceCost,
} from '../services/vehicleService'
import { setRentalStatus, deleteRental } from '../services/rentalService'
import { inr, inrShort, num, fmtDate } from '../utils/format'

export default function VehicleAnalytics() {
  const { id } = useParams()
  const { vehicles, rentals, statsByVehicle, loading, updateVehicleOptimistic } = useData()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [toDeleteRental, setToDeleteRental] = useState(null)

  // Maintenance state
  const [showMaintForm, setShowMaintForm] = useState(false)
  const [maintAmount, setMaintAmount] = useState('')
  const [maintDate, setMaintDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [maintType, setMaintType] = useState('General Service')
  const [maintNotes, setMaintNotes] = useState('')
  const [maintBusy, setMaintBusy] = useState(false)
  const [toDeleteMaint, setToDeleteMaint] = useState(null)
  const [directCostEdit, setDirectCostEdit] = useState(false)
  const [directCost, setDirectCost] = useState('')

  const vehicle = vehicles.find((v) => v.id === id)
  const mine = useMemo(() => rentals.filter((r) => r.vehicleId === id), [rentals, id])
  const stats = statsFor(statsByVehicle, id, vehicle)
  const months = useMemo(() => monthlySeries(mine, 6), [mine])
  const records = useMemo(
    () => (Array.isArray(vehicle?.maintenanceRecords) ? vehicle.maintenanceRecords : []),
    [vehicle?.maintenanceRecords]
  )

  const handleAddMaintenance = async (e) => {
    e.preventDefault()
    const amt = Number(maintAmount)
    if (!amt || amt <= 0) {
      toast('Please enter a valid maintenance amount', 'error')
      return
    }
    setMaintBusy(true)
    const newRecord = {
      id: `maint_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      amount: amt,
      date: maintDate || new Date().toISOString().slice(0, 10),
      type: maintType,
      description: maintNotes.trim(),
      createdAt: new Date().toISOString(),
    }
    const nextRecords = [newRecord, ...records]
    const nextTotal = nextRecords.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)

    // Optimistic UI update immediately
    updateVehicleOptimistic(vehicle.id, {
      maintenanceRecords: nextRecords,
      maintenanceCost: nextTotal,
    })
    toast(`Recorded ₹${amt.toLocaleString('en-IN')} maintenance. Vehicle profit updated!`)
    setMaintAmount('')
    setMaintNotes('')
    setShowMaintForm(false)

    try {
      await addVehicleMaintenanceRecord(vehicle.id, vehicle, newRecord)
    } catch (err) {
      toast(`Error saving to database: ${err.message}`, 'error')
    } finally {
      setMaintBusy(false)
    }
  }

  const handleDeleteMaintenance = async () => {
    if (!toDeleteMaint) return
    const target = toDeleteMaint
    setToDeleteMaint(null)

    const nextRecords = records.filter((r) => r.id !== target.id)
    const nextTotal = nextRecords.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)

    // Optimistic update
    updateVehicleOptimistic(vehicle.id, {
      maintenanceRecords: nextRecords,
      maintenanceCost: nextTotal,
    })
    toast(`Maintenance entry removed. Profit updated.`)

    try {
      await deleteVehicleMaintenanceRecord(vehicle.id, vehicle, target.id)
    } catch (err) {
      toast(`Error syncing delete: ${err.message}`, 'error')
    }
  }

  const handleSaveDirectCost = async (e) => {
    e.preventDefault()
    const val = Math.max(0, Number(directCost) || 0)
    setMaintBusy(true)
    updateVehicleOptimistic(vehicle.id, { maintenanceCost: val })
    toast(`Maintenance cost set to ₹${val.toLocaleString('en-IN')}`)
    setDirectCostEdit(false)
    try {
      await setVehicleMaintenanceCost(vehicle.id, val)
    } catch (err) {
      toast(`Failed to update: ${err.message}`, 'error')
    } finally {
      setMaintBusy(false)
    }
  }

  if (loading && !vehicle) return <PageLoader label="Loading vehicle" />

  if (!vehicle)
    return (
      <div className="center-pad">
        <p>That vehicle isn't in the fleet any more.</p>
        <Link to="/vehicles" className="btn">
          Back to vehicles
        </Link>
      </div>
    )

  const avgValue = stats.rentals ? stats.revenue / stats.rentals : 0
  const avgDays = stats.rentals ? stats.days / stats.rentals : 0
  const perDay = stats.days ? stats.revenue / stats.days : 0
  const split = [
    { name: 'Collected', value: stats.paid, fill: chartColors.green },
    { name: 'Outstanding', value: stats.balance, fill: chartColors.red },
  ].filter((d) => d.value > 0)

  const changeVehicleStatus = async (next) => {
    try {
      await setVehicleStatus(vehicle.id, next)
      toast(`${vehicle.name} marked as ${next === 'rented' ? 'on rent' : next}`)
    } catch (e) {
      toast(`Couldn't update: ${e.message}`, 'error')
    }
  }

  return (
    <>
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/vehicles')} style={{ marginBottom: 10, paddingLeft: 0 }}>
        <ArrowLeft size={15} /> All vehicles
      </button>

      <section className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-body">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div className="hero-plate">
              {vehicle.image ? (
                <img className="hero-img" src={vehicle.image} alt={vehicle.name} loading="lazy" />
              ) : (
                <div className="hero-img" style={{ display: 'grid', placeItems: 'center', fontFamily: 'var(--font-head)', fontSize: '1.6rem', color: 'var(--faint)' }}>
                  {vehicle.name[0]}
                </div>
              )}
              <div>
                <h1 style={{ marginBottom: 6 }}>{vehicle.name}</h1>
                <div className="row" style={{ gap: 8 }}>
                  <Plate number={vehicle.registrationNumber} size="lg" />
                  <StatusBadge kind="vehicle" status={vehicle.status} />
                </div>
                <p className="hint" style={{ marginTop: 8 }}>
                  {vehicle.year}
                  {stats.lastRentalAt ? ` · last out ${fmtDate(stats.lastRentalAt)}` : ' · never rented'}
                </p>
              </div>
            </div>

            <div className="head-actions">
              <select className="select" style={{ height: 40, width: 'auto' }} value={vehicle.status} onChange={(e) => changeVehicleStatus(e.target.value)} aria-label="Change vehicle status">
                <option value="available">Available</option>
                <option value="rented">On rent</option>
                <option value="maintenance">Maintenance</option>
              </select>
              <Link to={`/vehicles/edit/${vehicle.id}`} className="btn">
                <Pencil size={15} /> Edit
              </Link>
              <Link to={`/rentals/new?vehicle=${vehicle.id}`} className="btn btn-primary">
                <Plus size={15} /> Rent this out
              </Link>
            </div>
          </div>

          {vehicle.notes && (
            <p style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line)', color: 'var(--muted)', fontSize: '0.88rem' }}>
              {vehicle.notes}
            </p>
          )}
        </div>
      </section>

      <div className="stat-grid">
        <StatCard
          icon={Coins}
          label="Net vehicle profit"
          value={inr(stats.profit)}
          foot={stats.maintenanceCost > 0 ? `Revenue ${inrShort(stats.revenue)} − Maint ${inrShort(stats.maintenanceCost)}` : 'Revenue − Maintenance'}
          accent={stats.profit >= 0 ? 'var(--green)' : 'var(--red)'}
          accentSoft={stats.profit >= 0 ? 'var(--green-soft)' : 'var(--red-soft)'}
        />
        <StatCard
          icon={Wrench}
          label="Maintenance cost"
          value={inr(stats.maintenanceCost)}
          foot={records.length ? `${records.length} service record${records.length === 1 ? '' : 's'}` : 'Deducted from profit'}
          accent="var(--amber)"
          accentSoft="var(--amber-soft)"
        />
        <StatCard icon={Repeat} label="Times rented" value={num(stats.rentals)} foot={`${num(stats.activeRentals)} active now`} accent="var(--amber)" accentSoft="var(--amber-soft)" />
        <StatCard icon={CalendarDays} label="Days on rent" value={num(stats.days)} foot={`${avgDays.toFixed(1)} days per trip`} accent="var(--blue)" accentSoft="var(--blue-soft)" />
        <StatCard icon={IndianRupee} label="Revenue earned" value={inr(stats.revenue)} foot={`${inr(perDay)} per day on rent`} accent="var(--violet)" accentSoft="rgba(139,108,240,0.14)" />
        <StatCard icon={Wallet} label="Collected" value={inr(stats.paid)} foot={stats.revenue ? `${((stats.paid / stats.revenue) * 100).toFixed(0)}% of billed` : '—'} accent="var(--green)" accentSoft="var(--green-soft)" />
        <StatCard icon={AlertCircle} label="Still owed" value={inr(stats.balance)} foot={stats.balance > 0 ? 'Chase this on the rentals below' : 'Nothing outstanding'} accent="var(--red)" accentSoft="var(--red-soft)" />
        <StatCard icon={IndianRupee} label="Average rental" value={inr(avgValue)} foot="Per booking" accent="var(--amber)" accentSoft="var(--amber-soft)" />
        <StatCard icon={Timer} label="Average duration" value={`${avgDays.toFixed(1)} days`} foot="Per booking" accent="var(--blue)" accentSoft="var(--blue-soft)" />
        <StatCard icon={ClipboardList} label="Share of fleet revenue" value={`${revenueShare(stats.revenue, vehicles, statsByVehicle)}%`} foot="Against every other vehicle" accent="var(--green)" accentSoft="var(--green-soft)" />
      </div>

      <section className="panel" style={{ marginBottom: 16 }}>
        <header className="panel-head">
          <div className="row" style={{ gap: 8 }}>
            <span className="stat-icon" style={{ '--accent-soft': 'var(--amber-soft)', '--accent': 'var(--amber)', width: 32, height: 32 }}>
              <Wrench size={16} />
            </span>
            <div>
              <h3>Vehicle Maintenance & Profit Calculation</h3>
              <p className="sub">
                Maintenance costs are automatically deducted from {vehicle.name}&apos;s total profit
              </p>
            </div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button
              className="btn btn-sm"
              onClick={() => {
                setDirectCost(String(stats.maintenanceCost || ''))
                setDirectCostEdit((s) => !s)
                setShowMaintForm(false)
              }}
            >
              <Pencil size={13} /> {directCostEdit ? 'Close' : 'Set lump-sum cost'}
            </button>
            <button
              className="btn btn-sm btn-primary"
              onClick={() => {
                setShowMaintForm((s) => !s)
                setDirectCostEdit(false)
              }}
            >
              <Plus size={14} /> {showMaintForm ? 'Close form' : 'Record maintenance'}
            </button>
          </div>
        </header>

        <div className="panel-body">
          {/* Profit Breakdown Bar */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
              padding: '12px 16px',
              borderRadius: 'var(--r-md)',
              background: 'var(--card-bg, rgba(255,255,255,0.03))',
              border: '1px solid var(--line)',
              marginBottom: 16,
            }}
          >
            <div>
              <span className="cell-sub" style={{ fontSize: '0.78rem' }}>Vehicle Gross Revenue</span>
              <div className="num" style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--fg)' }}>
                {inr(stats.revenue)}
              </div>
            </div>
            <div>
              <span className="cell-sub" style={{ fontSize: '0.78rem' }}>Total Maintenance Cost</span>
              <div className="num" style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--amber)' }}>
                − {inr(stats.maintenanceCost)}
              </div>
            </div>
            <div>
              <span className="cell-sub" style={{ fontSize: '0.78rem' }}>Net Vehicle Profit</span>
              <div
                className="num"
                style={{
                  fontSize: '1.2rem',
                  fontWeight: 700,
                  color: stats.profit >= 0 ? 'var(--green)' : 'var(--red)',
                }}
              >
                {inr(stats.profit)}
              </div>
            </div>
            <div>
              <span className="cell-sub" style={{ fontSize: '0.78rem' }}>Profit Status</span>
              <div style={{ marginTop: 4 }}>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: 6,
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    background: stats.profit >= 0 ? 'var(--green-soft)' : 'var(--red-soft)',
                    color: stats.profit >= 0 ? 'var(--green)' : 'var(--red)',
                  }}
                >
                  {stats.profit >= 0 ? 'Profitable' : 'Deficit / Investment'}
                </span>
              </div>
            </div>
          </div>

          {/* Form to Add Maintenance */}
          {showMaintForm && (
            <form onSubmit={handleAddMaintenance} style={{ marginBottom: 20, padding: 16, borderRadius: 'var(--r-md)', background: 'var(--card-bg, rgba(255,255,255,0.02))', border: '1px solid var(--line)' }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '0.95rem' }}>Enter Maintenance Details</h4>
              <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                <div className="field">
                  <label htmlFor="m_amount">Amount (₹) <span className="req">*</span></label>
                  <input
                    id="m_amount"
                    className="input"
                    type="number"
                    min="1"
                    required
                    autoFocus
                    value={maintAmount}
                    onChange={(e) => setMaintAmount(e.target.value)}
                    placeholder="e.g. 4500"
                  />
                  <span className="hint">This amount decreases vehicle profit</span>
                </div>
                <div className="field">
                  <label htmlFor="m_date">Service Date</label>
                  <input
                    id="m_date"
                    className="input"
                    type="date"
                    value={maintDate}
                    onChange={(e) => setMaintDate(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="m_type">Service Category</label>
                  <select
                    id="m_type"
                    className="select"
                    value={maintType}
                    onChange={(e) => setMaintType(e.target.value)}
                  >
                    <option value="General Service">General Service</option>
                    <option value="Oil & Fluids">Oil & Fluids</option>
                    <option value="Tyres & Wheels">Tyres & Wheels</option>
                    <option value="Brakes & Suspension">Brakes & Suspension</option>
                    <option value="Engine & Transmission">Engine & Transmission</option>
                    <option value="Battery & Electrical">Battery & Electrical</option>
                    <option value="Bodywork & Painting">Bodywork & Painting</option>
                    <option value="Inspection / PUC">Inspection / PUC</option>
                    <option value="Other Repairs">Other Repairs</option>
                  </select>
                </div>
                <div className="field span-2">
                  <label htmlFor="m_notes">Description / Notes</label>
                  <input
                    id="m_notes"
                    className="input"
                    value={maintNotes}
                    onChange={(e) => setMaintNotes(e.target.value)}
                    placeholder="e.g. Oil filter change, brake pad replacement, invoice #1024"
                  />
                </div>
              </div>
              <div className="row" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowMaintForm(false)} disabled={maintBusy}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={maintBusy}>
                  {maintBusy ? <Spinner /> : <Plus size={14} />} Save & Deduct From Profit
                </button>
              </div>
            </form>
          )}

          {/* Quick Direct Cost Setting Form */}
          {directCostEdit && (
            <form onSubmit={handleSaveDirectCost} style={{ marginBottom: 20, padding: 16, borderRadius: 'var(--r-md)', background: 'var(--card-bg, rgba(255,255,255,0.02))', border: '1px solid var(--line)' }}>
              <h4 style={{ margin: '0 0 8px', fontSize: '0.95rem' }}>Direct Lump-Sum Maintenance Cost</h4>
              <p className="hint" style={{ marginBottom: 12 }}>
                Enter total maintenance spent on this vehicle directly. This will be deducted from profit.
              </p>
              <div className="row" style={{ gap: 10, alignItems: 'center' }}>
                <input
                  type="number"
                  min="0"
                  className="input"
                  style={{ maxWidth: 220 }}
                  value={directCost}
                  onChange={(e) => setDirectCost(e.target.value)}
                  placeholder="Total maintenance ₹"
                />
                <button type="submit" className="btn btn-primary btn-sm" disabled={maintBusy}>
                  {maintBusy ? <Spinner /> : 'Save Total Cost'}
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDirectCostEdit(false)}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Records Table */}
          {records.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Notes</th>
                    <th className="right">Cost / Amount</th>
                    <th className="right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(r.date)}</td>
                      <td>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            background: 'var(--amber-soft)',
                            color: 'var(--amber)',
                          }}
                        >
                          {r.type || 'Service'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>
                        {r.description || '—'}
                      </td>
                      <td className="right num" style={{ fontWeight: 600, color: 'var(--amber)' }}>
                        {inr(r.amount)}
                      </td>
                      <td className="right">
                        <button
                          className="icon-btn ghost"
                          style={{ width: 28, height: 28 }}
                          onClick={() => setToDeleteMaint(r)}
                          title="Delete record"
                          aria-label="Delete maintenance record"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--muted)' }}>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>
                {stats.maintenanceCost > 0
                  ? `Direct maintenance cost set to ${inr(stats.maintenanceCost)}. Use "Record maintenance" to log itemized service history.`
                  : 'No maintenance recorded for this vehicle. Click "+ Record maintenance" to add service expenses.'}
              </p>
            </div>
          )}
        </div>
      </section>

      {stats.rentals === 0 ? (
        <section className="panel">
          <EmptyState
            icon={CalendarDays}
            title={`${vehicle.name} hasn't been rented yet`}
            body="Record its first rental and this page fills with earnings, day counts and payment history."
            actionLabel="Rent this out"
            actionTo={`/rentals/new?vehicle=${vehicle.id}`}
          />
        </section>
      ) : (
        <>
          <div className="grid-main" style={{ marginBottom: 16 }}>
            <ChartCard title="How this vehicle performs" sub="Revenue bars against rentals and days, month by month">
              <div className="chart-box tall">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={months}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
                    <XAxis dataKey="label" {...axisProps} />
                    <YAxis yAxisId="money" {...axisProps} width={54} tickFormatter={inrShort} />
                    <YAxis yAxisId="count" orientation="right" {...axisProps} width={32} allowDecimals={false} />
                    <Tooltip {...tooltipStyle} formatter={(v, n) => (n === 'Revenue' ? [inr(v), n] : [v, n])} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    <Bar yAxisId="money" dataKey="revenue" name="Revenue" fill={chartColors.amber} radius={[5, 5, 0, 0]} barSize={26} />
                    <Line yAxisId="count" type="monotone" dataKey="rentals" name="Rentals" stroke={chartColors.blue} strokeWidth={2} dot={{ r: 3 }} />
                    <Line yAxisId="count" type="monotone" dataKey="days" name="Days out" stroke={chartColors.violet} strokeWidth={2} strokeDasharray="4 3" dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <div className="stack">
              <ChartCard title="Paid against pending" sub={`${inr(stats.revenue)} billed on this vehicle`}>
                {split.length === 0 ? (
                  <p className="hint">Nothing billed yet.</p>
                ) : (
                  <>
                    <div className="chart-box short">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={split} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="84%" paddingAngle={3} stroke="none">
                            {split.map((d) => (
                              <Cell key={d.name} fill={d.fill} />
                            ))}
                          </Pie>
                          <Tooltip {...tooltipStyle} formatter={(v) => inr(v)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <PaymentCard revenue={stats.revenue} paid={stats.paid} pending={stats.balance} compact />
                  </>
                )}
              </ChartCard>

              <ChartCard title="Where it goes" sub="Most common destinations">
                <TopLocations rentals={mine} />
              </ChartCard>
            </div>
          </div>

          <ChartCard title="Rental history" sub={`${mine.length} booking${mine.length === 1 ? '' : 's'} on ${vehicle.registrationNumber}`} flush>
            <RentalTable
              rentals={mine}
              hideVehicle
              onStatusChange={async (r, next) => {
                try {
                  await setRentalStatus(r, next)
                  toast(next === 'completed' ? `${vehicle.name} is back and available` : 'Rental updated')
                } catch (e) {
                  toast(`Couldn't update: ${e.message}`, 'error')
                }
              }}
              onEdit={(r) => navigate(`/rentals/edit/${r.id}`)}
              onDelete={setToDeleteRental}
            />
          </ChartCard>
        </>
      )}

      <ConfirmDialog
        open={Boolean(toDeleteRental)}
        danger
        title="Delete this rental?"
        body={`${toDeleteRental?.driverName}'s rental will be removed from this vehicle's history and its revenue taken out of the totals.`}
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

      <ConfirmDialog
        open={Boolean(toDeleteMaint)}
        danger
        title="Delete maintenance record?"
        body={`Removing the ₹${Number(toDeleteMaint?.amount || 0).toLocaleString('en-IN')} expense will increase ${vehicle.name}'s net profit.`}
        confirmLabel="Delete record"
        onCancel={() => setToDeleteMaint(null)}
        onConfirm={handleDeleteMaintenance}
      />
    </>
  )
}

/** This vehicle's revenue as a share of the whole fleet's. */
function revenueShare(revenue, vehicles, statsByVehicle) {
  const fleet = vehicles.reduce((t, v) => t + statsFor(statsByVehicle, v.id).revenue, 0)
  return fleet ? ((revenue / fleet) * 100).toFixed(0) : '0'
}

function TopLocations({ rentals }) {
  const places = useMemo(() => {
    const map = new Map()
    for (const r of rentals) {
      if (!r.location || r.status === 'cancelled') continue
      const e = map.get(r.location) || { name: r.location, trips: 0, revenue: 0 }
      e.trips += 1
      e.revenue += Number(r.totalAmount) || 0
      map.set(r.location, e)
    }
    return [...map.values()].sort((a, b) => b.trips - a.trips).slice(0, 5)
  }, [rentals])

  if (places.length === 0) return <p className="hint">No destinations recorded.</p>

  const max = Math.max(...places.map((p) => p.trips))

  return (
    <div>
      {places.map((p) => (
        <div className="bar-row" key={p.name}>
          <span style={{ fontSize: '0.88rem' }}>{p.name}</span>
          <span className="num" style={{ fontSize: '0.86rem', color: 'var(--muted)' }}>
            {p.trips} trip{p.trips === 1 ? '' : 's'} · {inr(p.revenue)}
          </span>
          <span className="bar-track">
            <span className="bar-fill" style={{ width: `${(p.trips / max) * 100}%` }} />
          </span>
        </div>
      ))}
    </div>
  )
}
