import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, TrendingDown, Trophy, Scale } from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
} from 'recharts'
import { useData } from '../context/DataContext'
import ChartCard, { axisProps, chartColors, tooltipStyle } from '../components/ChartCard'
import EmptyState from '../components/EmptyState'
import Plate from '../components/Plate'
import StatusBadge from '../components/StatusBadge'
import { SkeletonRows } from '../components/Loading'
import { withStats, monthlySeries, dailySeries, weeklySeries } from '../utils/analytics'
import { inr, inrShort, num } from '../utils/format'

const TREND = {
  day: { label: 'Daily', build: (r) => dailySeries(r, 14), sub: 'Last 14 days' },
  week: { label: 'Weekly', build: (r) => weeklySeries(r, 8), sub: 'Last 8 weeks, by week starting' },
  month: { label: 'Monthly', build: (r) => monthlySeries(r, 12), sub: 'Last 12 months' },
}

const METRICS = {
  revenue: { label: 'Revenue', get: (v) => v.stats.revenue, fmt: inr, color: chartColors.amber },
  rentals: { label: 'Rentals', get: (v) => v.stats.rentals, fmt: num, color: chartColors.blue },
  days: { label: 'Days on rent', get: (v) => v.stats.days, fmt: num, color: chartColors.violet },
  avg: {
    label: 'Average rental value',
    get: (v) => (v.stats.rentals ? v.stats.revenue / v.stats.rentals : 0),
    fmt: inr,
    color: chartColors.green,
  },
  balance: { label: 'Outstanding', get: (v) => v.stats.balance, fmt: inr, color: chartColors.red },
}

export default function Analytics() {
  const { vehicles, rentals, loading } = useData()
  const [grain, setGrain] = useState('month')
  const [metric, setMetric] = useState('revenue')
  const [picked, setPicked] = useState([])

  const fleet = useMemo(() => withStats(vehicles, rentals), [vehicles, rentals])
  const ranked = useMemo(
    () => [...fleet].sort((a, b) => METRICS[metric].get(b) - METRICS[metric].get(a)),
    [fleet, metric]
  )
  const trend = useMemo(() => TREND[grain].build(rentals), [rentals, grain])

  const worked = fleet.filter((v) => v.stats.rentals > 0)
  const best = ranked[0]
  const idlest = [...fleet].sort((a, b) => a.stats.days - b.stats.days)[0]

  const comparison = picked.length ? fleet.filter((v) => picked.includes(v.id)) : ranked.slice(0, 3)

  const radarData = useMemo(() => {
    if (!comparison.length || !fleet.length) return []
    const max = {
      rentals: Math.max(1, ...fleet.map((v) => v.stats?.rentals || 0)),
      days: Math.max(1, ...fleet.map((v) => v.stats?.days || 0)),
      revenue: Math.max(1, ...fleet.map((v) => v.stats?.revenue || 0)),
      avg: Math.max(1, ...fleet.map((v) => (v.stats?.rentals ? (v.stats.revenue || 0) / v.stats.rentals : 0))),
    }
    return [
      { axis: 'Rentals', ...Object.fromEntries(comparison.map((v) => [`v_${v.id}`, ((v.stats?.rentals || 0) / max.rentals) * 100])) },
      { axis: 'Days out', ...Object.fromEntries(comparison.map((v) => [`v_${v.id}`, ((v.stats?.days || 0) / max.days) * 100])) },
      { axis: 'Revenue', ...Object.fromEntries(comparison.map((v) => [`v_${v.id}`, ((v.stats?.revenue || 0) / max.revenue) * 100])) },
      {
        axis: 'Avg value',
        ...Object.fromEntries(
          comparison.map((v) => [
            `v_${v.id}`,
            (((v.stats?.rentals ? (v.stats.revenue || 0) / v.stats.rentals : 0) / max.avg) * 100) || 0,
          ])
        ),
      },
    ]
  }, [comparison, fleet])

  const toggle = (id) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 4 ? p : [...p, id]))

  const palette = [chartColors.amber, chartColors.blue, chartColors.green, chartColors.violet]

  if (loading && fleet.length === 0)
    return (
      <div className="panel">
        <SkeletonRows rows={6} height={64} />
      </div>
    )

  if (worked.length === 0)
    return (
      <section className="panel">
        <EmptyState
          icon={TrendingUp}
          title="Nothing to analyse yet"
          body="Once you've recorded a few rentals, this page compares your vehicles side by side and shows how demand moves through the week and the year."
          actionLabel="Record a rental"
          actionTo="/rentals/new"
        />
      </section>
    )

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Analytics</h1>
          <p>Which vehicles earn their keep, and when the work comes in</p>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 16 }}>
        <section className="panel">
          <div className="panel-body row" style={{ gap: 14, alignItems: 'flex-start' }}>
            <span className="stat-icon" style={{ '--accent-soft': 'var(--green-soft)', '--accent': 'var(--green)', width: 38, height: 38, flex: '0 0 38px' }}>
              <Trophy size={18} />
            </span>
            <div style={{ minWidth: 0 }}>
              <span className="cell-sub">Best performer by {METRICS[metric].label.toLowerCase()}</span>
              <h3 style={{ margin: '2px 0 6px' }}>{best?.name}</h3>
              <div className="row" style={{ gap: 8 }}>
                <Plate number={best?.registrationNumber} />
                <strong className="num">{METRICS[metric].fmt(METRICS[metric].get(best))}</strong>
              </div>
              <p className="hint" style={{ marginTop: 6 }}>
                {num(best?.stats.rentals)} rentals · {num(best?.stats.days)} days out
              </p>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-body row" style={{ gap: 14, alignItems: 'flex-start' }}>
            <span className="stat-icon" style={{ '--accent-soft': 'var(--red-soft)', '--accent': 'var(--red)', width: 38, height: 38, flex: '0 0 38px' }}>
              <TrendingDown size={18} />
            </span>
            <div style={{ minWidth: 0 }}>
              <span className="cell-sub">Sitting idle the longest</span>
              <h3 style={{ margin: '2px 0 6px' }}>{idlest?.name}</h3>
              <div className="row" style={{ gap: 8 }}>
                <Plate number={idlest?.registrationNumber} />
                <StatusBadge kind="vehicle" status={idlest?.status} />
              </div>
              <p className="hint" style={{ marginTop: 6 }}>
                Only {num(idlest?.stats.days)} days on rent for {inr(idlest?.stats.revenue)}
              </p>
            </div>
          </div>
        </section>
      </div>

      <ChartCard
        title="Vehicle league table"
        sub="Every vehicle ranked, worst to best at a glance"
        action={
          <select className="select" style={{ height: 34, width: 'auto', fontSize: '0.84rem' }} value={metric} onChange={(e) => setMetric(e.target.value)} aria-label="Rank by">
            {Object.entries(METRICS).map(([k, m]) => (
              <option key={k} value={k}>
                Rank by {m.label.toLowerCase()}
              </option>
            ))}
          </select>
        }
      >
        <div className="chart-box tall">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ranked.map((v) => ({ name: v.name, value: METRICS[metric].get(v) }))} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--line)" />
              <XAxis type="number" {...axisProps} tickFormatter={(v) => (metric === 'rentals' || metric === 'days' ? v : inrShort(v))} />
              <YAxis type="category" dataKey="name" {...axisProps} width={104} />
              <Tooltip {...tooltipStyle} formatter={(v) => [METRICS[metric].fmt(v), METRICS[metric].label]} />
              <Bar dataKey="value" fill={METRICS[metric].color} radius={[0, 6, 6, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard
        title="Rental trend"
        sub={TREND[grain].sub}
        action={
          <div className="tabs">
            {Object.entries(TREND).map(([k, t]) => (
              <button key={k} className={`tab ${grain === k ? 'active' : ''}`} onClick={() => setGrain(k)}>
                {t.label}
              </button>
            ))}
          </div>
        }
      >
        <div className="chart-box tall">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
              <XAxis dataKey="label" {...axisProps} />
              <YAxis yAxisId="count" {...axisProps} width={30} allowDecimals={false} />
              <YAxis yAxisId="money" orientation="right" {...axisProps} width={54} tickFormatter={inrShort} />
              <Tooltip {...tooltipStyle} formatter={(v, n) => (n === 'Revenue' ? [inr(v), n] : [v, n])} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Line yAxisId="count" type="monotone" dataKey="rentals" name="Rentals" stroke={chartColors.blue} strokeWidth={2.4} dot={{ r: 3 }} />
              <Line yAxisId="money" type="monotone" dataKey="revenue" name="Revenue" stroke={chartColors.amber} strokeWidth={2.4} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <section className="panel" style={{ marginTop: 16 }}>
        <header className="panel-head">
          <div>
            <h3>
              <Scale size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--amber)' }} />
              Compare vehicles
            </h3>
            <p className="sub">
              {picked.length ? `${picked.length} selected` : 'Showing your top three — pick up to four to compare'}
            </p>
          </div>
          {picked.length > 0 && (
            <button className="btn btn-sm" onClick={() => setPicked([])}>
              Reset
            </button>
          )}
        </header>

        <div className="panel-body" style={{ paddingBottom: 8 }}>
          <div className="row" style={{ gap: 8 }}>
            {fleet.map((v) => (
              <button key={v.id} className={`chip-toggle ${picked.includes(v.id) ? 'on' : ''}`} onClick={() => toggle(v.id)}>
                {v.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid-2" style={{ padding: 18, paddingTop: 10 }}>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="72%">
                <PolarGrid stroke="var(--line)" />
                <PolarAngleAxis dataKey="axis" tick={{ fill: 'var(--faint)', fontSize: 11 }} />
                {comparison.map((v, i) => (
                  <Radar key={v.id} name={v.name} dataKey={`v_${v.id}`} stroke={palette[i % 4]} fill={palette[i % 4]} fillOpacity={0.16} strokeWidth={2} />
                ))}
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Tooltip {...tooltipStyle} formatter={(v) => `${Number(v).toFixed(0)}% of best`} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="table-wrap">
            <table style={{ minWidth: 420 }}>
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th className="right">Rentals</th>
                  <th className="right">Days</th>
                  <th className="right">Revenue</th>
                  <th className="right">Avg value</th>
                  <th className="right">Owed</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <Link to={`/vehicles/${v.id}`} className="cell-title">
                        {v.name}
                      </Link>
                      <span className="cell-sub">{v.registrationNumber}</span>
                    </td>
                    <td className="right num">{num(v.stats.rentals)}</td>
                    <td className="right num">{num(v.stats.days)}</td>
                    <td className="right num">{inr(v.stats.revenue)}</td>
                    <td className="right num">{inr(v.stats.rentals ? v.stats.revenue / v.stats.rentals : 0)}</td>
                    <td className="right num" style={{ color: v.stats.balance > 0 ? 'var(--red)' : 'var(--muted)' }}>
                      {inr(v.stats.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  )
}
