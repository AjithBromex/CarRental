import { useMemo, useState } from 'react'
import { Wallet, IndianRupee, AlertCircle, CheckCircle2 } from 'lucide-react'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import StatCard from '../components/StatCard'
import ChartCard, { axisProps, chartColors, tooltipStyle } from '../components/ChartCard'
import RentalTable from '../components/RentalTable'
import SearchBar from '../components/SearchBar'
import EmptyState from '../components/EmptyState'
import Modal from '../components/Modal'
import { Spinner, SkeletonRows } from '../components/Loading'
import { paymentStatus, countsAsBusiness, withStats } from '../utils/analytics'
import { recordPayment } from '../services/rentalService'
import { inr, inrShort, phoneDigits } from '../utils/format'

function CollectModal({ rental, onClose }) {
  const { toast } = useToast()
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  if (!rental) return null

  const balance = Math.max(0, (rental.totalAmount || 0) - (rental.amountPaid || 0))
  const value = Number(amount) || 0
  const invalid = value <= 0 || value > balance

  const save = async () => {
    setBusy(true)
    try {
      await recordPayment(rental, value)
      toast(`${inr(value)} recorded from ${rental.driverName}`)
      onClose()
    } catch (e) {
      toast(`Couldn't record: ${e.message}`, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      title="Record a payment"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={save} disabled={invalid || busy}>
            {busy && <Spinner />} Record {value > 0 ? inr(value) : 'payment'}
          </button>
        </>
      }
    >
      <dl className="kv" style={{ marginBottom: 16 }}>
        <dt>Driver</dt>
        <dd>{rental.driverName}</dd>
        <dt>Vehicle</dt>
        <dd>{rental.vehicleName}</dd>
        <dt>Total</dt>
        <dd>{inr(rental.totalAmount)}</dd>
        <dt>Already paid</dt>
        <dd>{inr(rental.amountPaid)}</dd>
        <dt>Outstanding</dt>
        <dd style={{ color: 'var(--red)' }}>{inr(balance)}</dd>
      </dl>

      <div className="field">
        <label htmlFor="amt">Amount received</label>
        <input id="amt" className={`input ${amount && invalid ? 'invalid' : ''}`} type="number" min="0" max={balance} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={String(balance)} autoFocus />
        {amount && invalid ? (
          <span className="err-text">
            <AlertCircle size={13} /> Enter an amount between ₹1 and {inr(balance)}
          </span>
        ) : (
          <button className="btn btn-sm" style={{ marginTop: 8, alignSelf: 'flex-start' }} onClick={() => setAmount(String(balance))}>
            Settle the full {inr(balance)}
          </button>
        )}
      </div>
    </Modal>
  )
}

export default function Payments() {
  const { rentals, vehicles, totals, loading } = useData()
  const [term, setTerm] = useState('')
  const [filter, setFilter] = useState('owing')
  const [collect, setCollect] = useState(null)

  const list = useMemo(() => {
    const q = term.trim().toLowerCase()
    const digits = phoneDigits(q)
    return rentals
      .filter(countsAsBusiness)
      .filter((r) => {
        const s = paymentStatus(r)
        if (filter === 'owing') return s !== 'paid'
        if (filter === 'all') return true
        return s === filter
      })
      .filter(
        (r) =>
          !q ||
          r.driverName?.toLowerCase().includes(q) ||
          r.vehicleName?.toLowerCase().includes(q) ||
          r.registrationNumber?.toLowerCase().includes(q) ||
          (digits.length >= 3 && phoneDigits(r.phoneNumber).includes(digits))
      )
      .sort((a, b) => (b.totalAmount - b.amountPaid) - (a.totalAmount - a.amountPaid))
  }, [rentals, term, filter])

  const counts = useMemo(() => {
    const live = rentals.filter(countsAsBusiness)
    return {
      paid: live.filter((r) => paymentStatus(r) === 'paid').length,
      partial: live.filter((r) => paymentStatus(r) === 'partial').length,
      pending: live.filter((r) => paymentStatus(r) === 'pending').length,
    }
  }, [rentals])

  const split = [
    { name: 'Collected', value: totals.paid, fill: chartColors.green },
    { name: 'Outstanding', value: totals.pending, fill: chartColors.red },
  ].filter((d) => d.value > 0)

  const owedByVehicle = useMemo(
    () =>
      withStats(vehicles, rentals)
        .filter((v) => v.stats.balance > 0)
        .sort((a, b) => b.stats.balance - a.stats.balance)
        .slice(0, 8)
        .map((v) => ({ name: v.name, balance: v.stats.balance })),
    [vehicles, rentals]
  )

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Payments</h1>
          <p>
            {totals.collectionRate.toFixed(0)}% of everything you've billed is in hand
          </p>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard icon={IndianRupee} label="Billed" value={inr(totals.revenue)} foot={`${counts.paid + counts.partial + counts.pending} rentals`} accent="var(--amber)" accentSoft="var(--amber-soft)" />
        <StatCard icon={Wallet} label="Collected" value={inr(totals.paid)} foot={`${counts.paid} fully settled`} accent="var(--green)" accentSoft="var(--green-soft)" />
        <StatCard icon={AlertCircle} label="Outstanding" value={inr(totals.pending)} foot={`${counts.partial + counts.pending} rentals owe you`} accent="var(--red)" accentSoft="var(--red-soft)" />
        <StatCard icon={CheckCircle2} label="Collection rate" value={`${totals.collectionRate.toFixed(0)}%`} foot="Paid against billed" accent="var(--blue)" accentSoft="var(--blue-soft)" />
      </div>

      <div className="grid-2" style={{ marginBottom: 16 }}>
        <ChartCard title="Paid against pending" sub="All rentals, all time">
          {split.length === 0 ? (
            <EmptyState icon={Wallet} title="Nothing billed yet" body="Record a rental to start tracking money in and money owed." />
          ) : (
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={split} dataKey="value" nameKey="name" innerRadius="56%" outerRadius="82%" paddingAngle={3} stroke="none">
                    {split.map((d) => (
                      <Cell key={d.name} fill={d.fill} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} formatter={(v) => inr(v)} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Who owes the most" sub="Outstanding balance by vehicle">
          {owedByVehicle.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Everything is settled" body="No vehicle has an outstanding balance right now." />
          ) : (
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={owedByVehicle} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--line)" />
                  <XAxis type="number" {...axisProps} tickFormatter={inrShort} />
                  <YAxis type="category" dataKey="name" {...axisProps} width={96} />
                  <Tooltip {...tooltipStyle} formatter={(v) => [inr(v), 'Outstanding']} />
                  <Bar dataKey="balance" fill={chartColors.red} radius={[0, 6, 6, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>
      </div>

      <div className="filters">
        <SearchBar value={term} onChange={setTerm} placeholder="Search driver, phone or vehicle" />
        <select className="select" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by payment status">
          <option value="owing">Still owing ({counts.partial + counts.pending})</option>
          <option value="pending">Unpaid ({counts.pending})</option>
          <option value="partial">Part paid ({counts.partial})</option>
          <option value="paid">Fully paid ({counts.paid})</option>
          <option value="all">Everything</option>
        </select>
      </div>

      <section className="panel">
        {loading ? (
          <SkeletonRows rows={5} />
        ) : list.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title={filter === 'owing' ? 'Nothing outstanding' : 'No rentals match'}
            body={filter === 'owing' ? 'Every rental has been paid in full.' : 'Try a different payment filter or search term.'}
          />
        ) : (
          <RentalTable rentals={list} onCollect={setCollect} />
        )}
      </section>

      {collect && <CollectModal rental={rentals.find((r) => r.id === collect.id) || collect} onClose={() => setCollect(null)} />}
    </>
  )
}
