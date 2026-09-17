import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Car,
  KeyRound,
  CheckCircle2,
  IndianRupee,
  Wallet,
  AlertCircle,
  CalendarDays,
  Activity,
  Plus,
  ArrowRight,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { useData } from '../context/DataContext'
import StatCard from '../components/StatCard'
import ChartCard, { axisProps, chartColors, tooltipStyle } from '../components/ChartCard'
import PaymentCard from '../components/PaymentCard'
import RentalTable from '../components/RentalTable'
import EmptyState from '../components/EmptyState'
import { SkeletonStats, SkeletonRows } from '../components/Loading'
import { inr, inrShort, num } from '../utils/format'
import { monthlySeries, dailySeries, withStats } from '../utils/analytics'

export default function Dashboard() {
  const { vehicles, rentals, totals, loading } = useData()
  const [range, setRange] = useState('6m')

  const months = useMemo(() => monthlySeries(rentals, range === '12m' ? 12 : 6), [rentals, range])
  const daily = useMemo(() => dailySeries(rentals, 14), [rentals])
  const topVehicles = useMemo(
    () =>
      withStats(vehicles, rentals)
        .filter((v) => v.stats.revenue > 0)
        .sort((a, b) => b.stats.revenue - a.stats.revenue)
        .slice(0, 6),
    [vehicles, rentals]
  )

  const fleetSplit = [
    { name: 'On rent', value: totals.rented, fill: chartColors.blue },
    { name: 'Available', value: totals.available, fill: chartColors.green },
    { name: 'Maintenance', value: totals.maintenance, fill: chartColors.amber },
  ].filter((d) => d.value > 0)

  const recent = rentals.slice(0, 6)

  if (loading) {
    return (
      <>
        <SkeletonStats count={8} />
        <div className="skeleton" style={{ height: 320, borderRadius: 'var(--r-lg)' }} />
      </>
    )
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Today at a glance</h1>
          <p>
            {totals.rented} of {totals.totalVehicles} vehicles are out · {totals.activeRentals}{' '}
            active rental{totals.activeRentals === 1 ? '' : 's'}
          </p>
        </div>
        <div className="head-actions">
          <Link to="/vehicles/new" className="btn">
            <Plus size={15} /> Add vehicle
          </Link>
          <Link to="/rentals/new" className="btn btn-primary">
            <Plus size={15} /> Record rental
          </Link>
        </div>
      </div>

      {vehicles.length === 0 ? (
        <section className="panel">
          <EmptyState
            icon={Car}
            title="Your fleet is empty"
            body="Add your first vehicle and the dashboard starts tracking its rentals, days out, earnings and balances automatically."
            actionLabel="Add your first vehicle"
            actionTo="/vehicles/new"
          />
        </section>
      ) : (
        <>
          <div className="stat-grid">
            <Link to="/vehicles" style={{ textDecoration: 'none', color: 'inherit', display: 'contents' }}>
              <StatCard icon={Car} label="Total vehicles" value={num(totals.totalVehicles)} foot={`${num(totals.maintenance)} in maintenance`} accent="var(--amber)" accentSoft="var(--amber-soft)" />
            </Link>
            <Link to="/rentals?status=active" style={{ textDecoration: 'none', color: 'inherit', display: 'contents' }}>
              <StatCard icon={KeyRound} label="On rent now" value={num(totals.rented)} foot={`${totals.utilisation.toFixed(0)}% of the fleet working`} accent="var(--blue)" accentSoft="var(--blue-soft)" />
            </Link>
            <Link to="/vehicles?status=available" style={{ textDecoration: 'none', color: 'inherit', display: 'contents' }}>
              <StatCard icon={CheckCircle2} label="Available" value={num(totals.available)} foot="Ready to hand over" accent="var(--green)" accentSoft="var(--green-soft)" />
            </Link>
            <Link to="/rentals?status=active" style={{ textDecoration: 'none', color: 'inherit', display: 'contents' }}>
              <StatCard icon={Activity} label="Active rentals" value={num(totals.activeRentals)} foot={`${num(totals.completedRentals)} completed`} accent="var(--violet)" accentSoft="rgba(139,108,240,0.14)" />
            </Link>
            <Link to="/analytics" style={{ textDecoration: 'none', color: 'inherit', display: 'contents' }}>
              <StatCard icon={IndianRupee} label="Rental revenue" value={inr(totals.revenue)} foot={`Across ${num(totals.totalRentals)} rentals`} accent="var(--amber)" accentSoft="var(--amber-soft)" />
            </Link>
            <Link to="/payments" style={{ textDecoration: 'none', color: 'inherit', display: 'contents' }}>
              <StatCard icon={Wallet} label="Collected" value={inr(totals.paid)} foot={`${totals.collectionRate.toFixed(0)}% of what you billed`} accent="var(--green)" accentSoft="var(--green-soft)" />
            </Link>
            <Link to="/payments" style={{ textDecoration: 'none', color: 'inherit', display: 'contents' }}>
              <StatCard icon={AlertCircle} label="Still owed" value={inr(totals.pending)} foot="Chase these on the Payments page" accent="var(--red)" accentSoft="var(--red-soft)" />
            </Link>
            <Link to="/rentals" style={{ textDecoration: 'none', color: 'inherit', display: 'contents' }}>
              <StatCard icon={CalendarDays} label="Rental days" value={num(totals.totalDays)} foot={`${totals.avgRentalDays.toFixed(1)} days per rental`} accent="var(--blue)" accentSoft="var(--blue-soft)" />
            </Link>
          </div>

          <div className="grid-main" style={{ marginBottom: 16 }}>
            <ChartCard
              title="Revenue by month"
              sub="Billed against what actually came in"
              action={
                <div className="tabs">
                  {['6m', '12m'].map((r) => (
                    <button key={r} className={`tab ${range === r ? 'active' : ''}`} onClick={() => setRange(r)}>
                      {r === '6m' ? '6 months' : '12 months'}
                    </button>
                  ))}
                </div>
              }
            >
              <div className="chart-box tall">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={months} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
                    <XAxis dataKey="label" {...axisProps} />
                    <YAxis {...axisProps} width={54} tickFormatter={inrShort} />
                    <Tooltip {...tooltipStyle} formatter={(v, n) => [inr(v), n]} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    <Bar dataKey="paid" name="Collected" stackId="money" fill={chartColors.green} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="pending" name="Outstanding" stackId="money" fill={chartColors.red} radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <div className="stack">
              <ChartCard title="Money position" sub="Everything billed, all time">
                <PaymentCard revenue={totals.revenue} paid={totals.paid} pending={totals.pending} />
                <Link to="/payments" className="btn btn-sm btn-block" style={{ marginTop: 16 }}>
                  Open payments <ArrowRight size={14} />
                </Link>
              </ChartCard>

              <ChartCard title="Where the fleet is" sub="Right now">
                {fleetSplit.length === 0 ? (
                  <p className="hint">No vehicles yet.</p>
                ) : (
                  <div className="chart-box short">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={fleetSplit} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="82%" paddingAngle={3} stroke="none">
                          {fleetSplit.map((d) => (
                            <Cell key={d.name} fill={d.fill} />
                          ))}
                        </Pie>
                        <Tooltip {...tooltipStyle} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </ChartCard>
            </div>
          </div>

          <div className="grid-2" style={{ marginBottom: 16 }}>
            <ChartCard title="Rentals started" sub="Last 14 days">
              <div className="chart-box">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={daily}>
                    <defs>
                      <linearGradient id="rentalFade" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={chartColors.amber} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={chartColors.amber} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
                    <XAxis dataKey="label" {...axisProps} interval={1} />
                    <YAxis {...axisProps} width={28} allowDecimals={false} />
                    <Tooltip {...tooltipStyle} />
                    <Area type="monotone" dataKey="rentals" name="Rentals" stroke={chartColors.amber} strokeWidth={2} fill="url(#rentalFade)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Top earners" sub="Revenue per vehicle, all time">
              {topVehicles.length === 0 ? (
                <EmptyState icon={IndianRupee} title="No revenue yet" body="Record a rental and your best-performing vehicles show up here." />
              ) : (
                <div className="chart-box">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topVehicles.map((v) => ({ name: v.name, revenue: v.stats.revenue }))} layout="vertical" margin={{ left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--line)" />
                      <XAxis type="number" {...axisProps} tickFormatter={inrShort} />
                      <YAxis type="category" dataKey="name" {...axisProps} width={96} />
                      <Tooltip {...tooltipStyle} formatter={(v) => [inr(v), 'Revenue']} />
                      <Bar dataKey="revenue" fill={chartColors.amber} radius={[0, 6, 6, 0]} barSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>
          </div>

          <ChartCard
            title="Recent rentals"
            sub="The last six entries"
            flush
            action={
              <Link to="/rentals" className="btn btn-sm">
                See all <ArrowRight size={14} />
              </Link>
            }
          >
            {loading ? (
              <SkeletonRows />
            ) : recent.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="No rentals recorded"
                body="Record your first rental to start building the history and revenue picture."
                actionLabel="Record a rental"
                actionTo="/rentals/new"
              />
            ) : (
              <RentalTable rentals={recent} />
            )}
          </ChartCard>
        </>
      )}
    </>
  )
}
