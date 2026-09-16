export default function ChartCard({ title, sub, action, children, flush }) {
  return (
    <section className="panel">
      <header className="panel-head">
        <div>
          <h3>{title}</h3>
          {sub && <p className="sub">{sub}</p>}
        </div>
        {action}
      </header>
      <div className={`panel-body ${flush ? 'flush' : ''}`}>{children}</div>
    </section>
  )
}

/** Shared recharts theming so every chart in the app matches. */
export const chartColors = {
  amber: '#f2b705',
  green: '#12a47a',
  red: '#e04437',
  blue: '#4a7dfa',
  violet: '#8b6cf0',
}

export const axisProps = {
  stroke: 'transparent',
  tickLine: false,
  axisLine: false,
}

export const tooltipStyle = {
  contentStyle: {
    background: 'var(--surface-2)',
    border: '1px solid var(--line)',
    borderRadius: 10,
    fontSize: 13,
    color: 'var(--text)',
  },
  labelStyle: { color: 'var(--text)', fontWeight: 600, marginBottom: 4 },
  itemStyle: { color: 'var(--muted)' },
  cursor: { fill: 'rgba(127,127,127,0.08)' },
}
