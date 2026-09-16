import { useMemo, useState } from 'react'
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
import { PageLoader } from '../components/Loading'
import { monthlySeries, statsFor } from '../utils/analytics'
import { setVehicleStatus } from '../services/vehicleService'
import { setRentalStatus, deleteRental } from '../services/rentalService'
import { inr, inrShort, num, fmtDate } from '../utils/format'

export default function VehicleAnalytics() {
  const { id } = useParams()
  const { vehicles, rentals, statsByVehicle, loading } = useData()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [toDeleteRental, setToDeleteRental] = useState(null)

  const vehicle = vehicles.find((v) => v.id === id)
  const mine = useMemo(() => rentals.filter((r) => r.vehicleId === id), [rentals, id])
  const stats = statsFor(statsByVehicle, id)
  const months = useMemo(() => monthlySeries(mine, 6), [mine])

  if (loading) return <PageLoader label="Loading vehicle" />

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
                  {vehicle.model || vehicle.type} · {vehicle.type} · {vehicle.year}
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
        <StatCard icon={Repeat} label="Times rented" value={num(stats.rentals)} foot={`${num(stats.activeRentals)} active now`} accent="var(--amber)" accentSoft="var(--amber-soft)" />
        <StatCard icon={CalendarDays} label="Days on rent" value={num(stats.days)} foot={`${avgDays.toFixed(1)} days per trip`} accent="var(--blue)" accentSoft="var(--blue-soft)" />
        <StatCard icon={IndianRupee} label="Revenue earned" value={inr(stats.revenue)} foot={`${inr(perDay)} per day on rent`} accent="var(--violet)" accentSoft="rgba(139,108,240,0.14)" />
        <StatCard icon={Wallet} label="Collected" value={inr(stats.paid)} foot={stats.revenue ? `${((stats.paid / stats.revenue) * 100).toFixed(0)}% of billed` : '—'} accent="var(--green)" accentSoft="var(--green-soft)" />
        <StatCard icon={AlertCircle} label="Still owed" value={inr(stats.balance)} foot={stats.balance > 0 ? 'Chase this on the rentals below' : 'Nothing outstanding'} accent="var(--red)" accentSoft="var(--red-soft)" />
        <StatCard icon={IndianRupee} label="Average rental" value={inr(avgValue)} foot="Per booking" accent="var(--amber)" accentSoft="var(--amber-soft)" />
        <StatCard icon={Timer} label="Average duration" value={`${avgDays.toFixed(1)} days`} foot="Per booking" accent="var(--blue)" accentSoft="var(--blue-soft)" />
        <StatCard icon={ClipboardList} label="Share of fleet revenue" value={`${revenueShare(stats.revenue, vehicles, statsByVehicle)}%`} foot="Against every other vehicle" accent="var(--green)" accentSoft="var(--green-soft)" />
      </div>

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
