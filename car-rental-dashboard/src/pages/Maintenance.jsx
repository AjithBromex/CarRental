import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Wrench,
  Car,
  Coins,
  IndianRupee,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ExternalLink,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import StatCard from '../components/StatCard'
import SearchBar from '../components/SearchBar'
import EmptyState from '../components/EmptyState'
import Plate from '../components/Plate'
import StatusBadge from '../components/StatusBadge'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import { Spinner, SkeletonCards } from '../components/Loading'
import { withStats } from '../utils/analytics'
import {
  addVehicleMaintenanceRecord,
  deleteVehicleMaintenanceRecord,
  setVehicleMaintenanceCost,
  setVehicleStatus,
} from '../services/vehicleService'
import { inr, inrShort, num, fmtDate } from '../utils/format'

export default function Maintenance() {
  const { vehicles, rentals, totals, loading, updateVehicleOptimistic } = useData()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [term, setTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('maintenance-desc')

  // Modals state
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditCostModal, setShowEditCostModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [toDeleteRecord, setToDeleteRecord] = useState(null)

  // Add maintenance form state
  const [formVehicleId, setFormVehicleId] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [formType, setFormType] = useState('General Service')
  const [formNotes, setFormNotes] = useState('')
  const [busy, setBusy] = useState(false)

  // Direct cost edit state
  const [directAmount, setDirectAmount] = useState('')

  // Vehicles with calculated stats
  const vehicleList = useMemo(() => withStats(vehicles, rentals), [vehicles, rentals])

  // Filter and sort vehicles
  const filteredList = useMemo(() => {
    const q = term.trim().toLowerCase()
    return vehicleList
      .filter((v) => (statusFilter === 'all' ? true : v.status === statusFilter))
      .filter(
        (v) =>
          !q ||
          v.name?.toLowerCase().includes(q) ||
          v.registrationNumber?.toLowerCase().includes(q)
      )
      .sort((a, b) => {
        if (sortBy === 'maintenance-desc') return (b.stats.maintenanceCost || 0) - (a.stats.maintenanceCost || 0)
        if (sortBy === 'maintenance-asc') return (a.stats.maintenanceCost || 0) - (b.stats.maintenanceCost || 0)
        if (sortBy === 'profit-desc') return (b.stats.profit ?? 0) - (a.stats.profit ?? 0)
        if (sortBy === 'profit-asc') return (a.stats.profit ?? 0) - (b.stats.profit ?? 0)
        if (sortBy === 'revenue-desc') return b.stats.revenue - a.stats.revenue
        return a.name.localeCompare(b.name)
      })
  }, [vehicleList, term, statusFilter, sortBy])

  // Open add maintenance modal for a specific vehicle or fleet
  const openAddModal = (veh = null) => {
    const targetId = veh?.id || vehicleList[0]?.id || ''
    setSelectedVehicle(veh || vehicleList.find((v) => v.id === targetId))
    setFormVehicleId(targetId)
    setFormAmount('')
    setFormDate(new Date().toISOString().slice(0, 10))
    setFormType('General Service')
    setFormNotes('')
    setShowAddModal(true)
  }

  // Open direct cost edit modal
  const openEditCostModal = (veh) => {
    setSelectedVehicle(veh)
    setDirectAmount(String(veh.stats.maintenanceCost || ''))
    setShowEditCostModal(true)
  }

  // Open service history modal
  const openHistoryModal = (veh) => {
    setSelectedVehicle(veh)
    setShowHistoryModal(true)
  }

  // Handle saving new maintenance expense
  const handleSaveMaintenance = async (e) => {
    e.preventDefault()
    const amt = Number(formAmount)
    if (!amt || amt <= 0) {
      toast('Please enter a valid maintenance amount', 'error')
      return
    }
    const veh = vehicles.find((v) => v.id === formVehicleId)
    if (!veh) {
      toast('Please select a vehicle', 'error')
      return
    }

    setBusy(true)
    const newRecord = {
      id: `maint_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      amount: amt,
      date: formDate || new Date().toISOString().slice(0, 10),
      type: formType,
      description: formNotes.trim(),
      createdAt: new Date().toISOString(),
    }

    const existing = Array.isArray(veh.maintenanceRecords) ? veh.maintenanceRecords : []
    const nextRecords = [newRecord, ...existing]
    const nextTotal = nextRecords.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)

    // Optimistic UI update
    updateVehicleOptimistic(veh.id, {
      maintenanceRecords: nextRecords,
      maintenanceCost: nextTotal,
    })
    toast(`Maintenance cost of ₹${amt.toLocaleString('en-IN')} recorded for ${veh.name}. Profit updated!`)
    setShowAddModal(false)

    try {
      await addVehicleMaintenanceRecord(veh.id, veh, newRecord)
    } catch (err) {
      toast(`Error syncing to database: ${err.message}`, 'error')
    } finally {
      setBusy(false)
    }
  }

  // Handle saving direct lump-sum maintenance cost
  const handleSaveDirectCost = async (e) => {
    e.preventDefault()
    if (!selectedVehicle) return
    const val = Math.max(0, Number(directAmount) || 0)
    setBusy(true)

    updateVehicleOptimistic(selectedVehicle.id, { maintenanceCost: val })
    toast(`Maintenance cost for ${selectedVehicle.name} updated to ₹${val.toLocaleString('en-IN')}`)
    setShowEditCostModal(false)

    try {
      await setVehicleMaintenanceCost(selectedVehicle.id, val)
    } catch (err) {
      toast(`Error saving: ${err.message}`, 'error')
    } finally {
      setBusy(false)
    }
  }

  // Handle deleting a service record
  const handleDeleteRecord = async () => {
    if (!toDeleteRecord || !selectedVehicle) return
    const recordId = toDeleteRecord.id
    setToDeleteRecord(null)

    const existing = Array.isArray(selectedVehicle.maintenanceRecords) ? selectedVehicle.maintenanceRecords : []
    const nextRecords = existing.filter((r) => r.id !== recordId)
    const nextTotal = nextRecords.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)

    updateVehicleOptimistic(selectedVehicle.id, {
      maintenanceRecords: nextRecords,
      maintenanceCost: nextTotal,
    })
    toast(`Maintenance record removed. Profit updated.`)

    try {
      await deleteVehicleMaintenanceRecord(selectedVehicle.id, selectedVehicle, recordId)
    } catch (err) {
      toast(`Failed to sync delete: ${err.message}`, 'error')
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Vehicle Maintenance</h1>
          <p>Each vehicle has a separate maintenance cost column deducted directly from its profit</p>
        </div>
        <div className="head-actions">
          <button className="btn btn-primary" onClick={() => openAddModal(null)} disabled={vehicles.length === 0}>
            <Plus size={15} /> Record maintenance
          </button>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard
          icon={Coins}
          label="Fleet net profit"
          value={inr(totals.totalProfit)}
          foot={`Revenue ${inrShort(totals.revenue)} − Maint ${inrShort(totals.totalMaintenance)}`}
          accent={totals.totalProfit >= 0 ? 'var(--green)' : 'var(--red)'}
          accentSoft={totals.totalProfit >= 0 ? 'var(--green-soft)' : 'var(--red-soft)'}
        />
        <StatCard
          icon={Wrench}
          label="Total fleet maintenance"
          value={inr(totals.totalMaintenance)}
          foot={`Across ${totals.totalVehicles} vehicles`}
          accent="var(--amber)"
          accentSoft="var(--amber-soft)"
        />
        <StatCard
          icon={IndianRupee}
          label="Total gross revenue"
          value={inr(totals.revenue)}
          foot={`${num(totals.totalRentals)} rentals recorded`}
          accent="var(--blue)"
          accentSoft="var(--blue-soft)"
        />
        <StatCard
          icon={Car}
          label="In maintenance now"
          value={num(totals.maintenance)}
          foot={`${num(totals.available)} available to rent`}
          accent="var(--violet)"
          accentSoft="rgba(139,108,240,0.14)"
        />
      </div>

      <div className="filters">
        <SearchBar value={term} onChange={setTerm} placeholder="Search vehicle name or plate" />
        <select
          className="select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by vehicle status"
        >
          <option value="all">Any vehicle status</option>
          <option value="available">Available</option>
          <option value="rented">On rent</option>
          <option value="maintenance">In maintenance</option>
        </select>
        <select
          className="select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          aria-label="Sort maintenance list"
        >
          <option value="maintenance-desc">Highest maintenance cost</option>
          <option value="maintenance-asc">Lowest maintenance cost</option>
          <option value="profit-desc">Highest net profit</option>
          <option value="profit-asc">Lowest profit / Deficit</option>
          <option value="revenue-desc">Highest revenue</option>
          <option value="name">Vehicle name A–Z</option>
        </select>
      </div>

      {loading && vehicles.length === 0 ? (
        <SkeletonCards count={4} />
      ) : filteredList.length === 0 ? (
        <section className="panel">
          <EmptyState
            icon={Wrench}
            title={vehicles.length ? 'No vehicles match those filters' : 'No vehicles in the fleet'}
            body={
              vehicles.length
                ? 'Try a different search or filter.'
                : 'Add your first vehicle to start tracking maintenance and profit.'
            }
            actionLabel={vehicles.length ? undefined : 'Add a vehicle'}
            actionTo={vehicles.length ? undefined : '/vehicles/new'}
          />
        </section>
      ) : (
        <section className="panel">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Plate</th>
                  <th>Status</th>
                  <th className="right">Gross Revenue</th>
                  <th className="right" style={{ background: 'rgba(229, 27, 36, 0.05)', color: 'var(--amber)' }}>
                    Maintenance Cost (Deducted)
                  </th>
                  <th className="right" style={{ background: 'rgba(16, 185, 129, 0.05)' }}>
                    Net Vehicle Profit
                  </th>
                  <th>Service History</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((v) => {
                  const records = Array.isArray(v.maintenanceRecords) ? v.maintenanceRecords : []
                  const maintCost = v.stats.maintenanceCost || 0
                  const profit = v.stats.profit ?? 0
                  const isPositive = profit >= 0

                  return (
                    <tr key={v.id}>
                      <td>
                        <Link
                          to={`/vehicles/${v.id}`}
                          className="cell-title"
                          style={{ textDecoration: 'underline', textDecorationColor: 'var(--line)' }}
                        >
                          {v.name}
                        </Link>
                        <span className="cell-sub">{v.year}</span>
                      </td>
                      <td>
                        <Plate number={v.registrationNumber} />
                      </td>
                      <td>
                        <StatusBadge kind="vehicle" status={v.status} />
                      </td>
                      <td className="right num" style={{ fontWeight: 500 }}>
                        {inr(v.stats.revenue)}
                      </td>
                      {/* Separate Maintenance Cost Column */}
                      <td
                        className="right num"
                        style={{
                          background: 'rgba(229, 27, 36, 0.03)',
                          fontWeight: 600,
                          color: maintCost > 0 ? 'var(--amber)' : 'var(--muted)',
                        }}
                      >
                        {maintCost > 0 ? `− ${inr(maintCost)}` : '₹0'}
                      </td>
                      {/* Separate Net Profit Column */}
                      <td
                        className="right num"
                        style={{
                          background: isPositive ? 'rgba(16, 185, 129, 0.03)' : 'rgba(239, 68, 68, 0.03)',
                          fontWeight: 700,
                          color: isPositive ? 'var(--green)' : 'var(--red)',
                        }}
                      >
                        {inr(profit)}
                        <span
                          className="cell-sub"
                          style={{
                            display: 'block',
                            fontSize: '0.72rem',
                            color: isPositive ? 'rgba(16, 185, 129, 0.8)' : 'rgba(239, 68, 68, 0.8)',
                          }}
                        >
                          {v.stats.revenue > 0 ? `${v.stats.profitMargin.toFixed(0)}% margin` : isPositive ? 'Break even' : 'Deficit'}
                        </span>
                      </td>
                      <td>
                        {records.length > 0 ? (
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '2px 8px', fontSize: '0.78rem', height: 26 }}
                            onClick={() => openHistoryModal(v)}
                          >
                            {records.length} record{records.length === 1 ? '' : 's'} · View
                          </button>
                        ) : (
                          <span style={{ color: 'var(--faint)', fontSize: '0.82rem' }}>No records</span>
                        )}
                      </td>
                      <td className="right">
                        <div className="row-actions">
                          <button
                            className="btn btn-sm btn-primary"
                            style={{ padding: '3px 8px', height: 26, fontSize: '0.78rem' }}
                            onClick={() => openAddModal(v)}
                            title={`Record maintenance for ${v.name}`}
                          >
                            <Plus size={12} /> Add cost
                          </button>
                          <Link
                            to={`/vehicles/${v.id}`}
                            className="icon-btn ghost"
                            style={{ width: 26, height: 26 }}
                            title="Vehicle details & analytics"
                          >
                            <ExternalLink size={13} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Record Maintenance Modal */}
      {showAddModal && (
        <Modal
          open
          title={`Record Maintenance Expense`}
          onClose={() => !busy && setShowAddModal(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setShowAddModal(false)} disabled={busy}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveMaintenance} disabled={busy}>
                {busy ? <Spinner /> : <Plus size={14} />} Save & Deduct From Profit
              </button>
            </>
          }
        >
          <form onSubmit={handleSaveMaintenance}>
            <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              <div className="field span-2">
                <label htmlFor="m_veh">Vehicle <span className="req">*</span></label>
                <select
                  id="m_veh"
                  className="select"
                  value={formVehicleId}
                  onChange={(e) => {
                    setFormVehicleId(e.target.value)
                    setSelectedVehicle(vehicles.find((v) => v.id === e.target.value))
                  }}
                >
                  {vehicleList.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.registrationNumber}) — Current Maint: {inr(v.stats.maintenanceCost || 0)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="m_amt">Amount (₹) <span className="req">*</span></label>
                <input
                  id="m_amt"
                  className="input"
                  type="number"
                  min="1"
                  required
                  autoFocus
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  placeholder="e.g. 3500"
                />
                <span className="hint">Deducted from vehicle profit immediately</span>
              </div>

              <div className="field">
                <label htmlFor="m_date">Service Date</label>
                <input
                  id="m_date"
                  className="input"
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
              </div>

              <div className="field">
                <label htmlFor="m_type">Service Category</label>
                <select
                  id="m_type"
                  className="select"
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
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
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. 40,000km periodic service, synthetic oil, oil filter"
                />
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Direct Total Maintenance Cost Modal */}
      {showEditCostModal && selectedVehicle && (
        <Modal
          open
          title={`Edit Total Maintenance: ${selectedVehicle.name}`}
          onClose={() => !busy && setShowEditCostModal(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setShowEditCostModal(false)} disabled={busy}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveDirectCost} disabled={busy}>
                {busy ? <Spinner /> : 'Save Total Cost'}
              </button>
            </>
          }
        >
          <form onSubmit={handleSaveDirectCost}>
            <p className="hint" style={{ marginBottom: 16 }}>
              Set or adjust the total maintenance amount directly for <strong>{selectedVehicle.name}</strong> ({selectedVehicle.registrationNumber}). This amount decreases the vehicle&apos;s net profit.
            </p>
            <div className="field">
              <label htmlFor="direct_amt">Total Maintenance Cost (₹)</label>
              <input
                id="direct_amt"
                className="input"
                type="number"
                min="0"
                autoFocus
                value={directAmount}
                onChange={(e) => setDirectAmount(e.target.value)}
                placeholder="0"
              />
              <span className="hint">
                Current Revenue: {inr(selectedVehicle.stats?.revenue || 0)} → New Net Profit:{' '}
                <strong>
                  {inr((selectedVehicle.stats?.revenue || 0) - (Math.max(0, Number(directAmount) || 0)))}
                </strong>
              </span>
            </div>
          </form>
        </Modal>
      )}

      {/* Vehicle Service Records History Modal */}
      {showHistoryModal && selectedVehicle && (
        <Modal
          open
          title={`Service History: ${selectedVehicle.name}`}
          onClose={() => setShowHistoryModal(false)}
          footer={
            <button className="btn" onClick={() => setShowHistoryModal(false)}>
              Close
            </button>
          }
        >
          <div style={{ marginBottom: 14 }}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
              <div>
                <strong>{selectedVehicle.name}</strong> · <Plate number={selectedVehicle.registrationNumber} />
              </div>
              <strong style={{ color: 'var(--amber)' }}>
                Total Maintenance: {inr(selectedVehicle.stats?.maintenanceCost || 0)}
              </strong>
            </div>
          </div>

          {Array.isArray(selectedVehicle.maintenanceRecords) && selectedVehicle.maintenanceRecords.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Notes</th>
                    <th className="right">Cost</th>
                    <th className="right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedVehicle.maintenanceRecords.map((r) => (
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
                      <td style={{ color: 'var(--muted)', fontSize: '0.86rem' }}>{r.description || '—'}</td>
                      <td className="right num" style={{ fontWeight: 600, color: 'var(--amber)' }}>
                        {inr(r.amount)}
                      </td>
                      <td className="right">
                        <button
                          className="icon-btn ghost"
                          style={{ width: 26, height: 26 }}
                          onClick={() => setToDeleteRecord(r)}
                          title="Delete record"
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
            <p className="hint">No itemized service records for this vehicle.</p>
          )}
        </Modal>
      )}

      {/* Confirm Delete Record Dialog */}
      <ConfirmDialog
        open={Boolean(toDeleteRecord)}
        danger
        title="Delete this maintenance record?"
        body={`Removing the ₹${Number(toDeleteRecord?.amount || 0).toLocaleString('en-IN')} expense will increase ${selectedVehicle?.name}'s net profit by that amount.`}
        confirmLabel="Delete record"
        onCancel={() => setToDeleteRecord(null)}
        onConfirm={handleDeleteRecord}
      />
    </>
  )
}
