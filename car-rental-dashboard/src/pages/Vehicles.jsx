import { useMemo, useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Car, Plus, LayoutGrid, List } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import VehicleCard from '../components/VehicleCard'
import VehicleTable from '../components/VehicleTable'
import SearchBar from '../components/SearchBar'
import EmptyState from '../components/EmptyState'
import ConfirmDialog from '../components/ConfirmDialog'
import { SkeletonCards } from '../components/Loading'
import { withStats } from '../utils/analytics'
import { deleteVehicle } from '../services/vehicleService'

const SORTS = {
  revenue: (a, b) => b.stats.revenue - a.stats.revenue,
  rentals: (a, b) => b.stats.rentals - a.stats.rentals,
  days: (a, b) => b.stats.days - a.stats.days,
  pending: (a, b) => b.stats.balance - a.stats.balance,
  name: (a, b) => a.name.localeCompare(b.name),
}

export default function Vehicles() {
  const { vehicles, rentals, loading, removeVehicleOptimistic, restoreVehicle } = useData()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [term, setTerm] = useState('')
  const [sort, setSort] = useState('revenue')
  const [view, setView] = useState(() => localStorage.getItem('fleetline:vview') || 'grid')
  const [toDelete, setToDelete] = useState(null)

  const status = params.get('status') || 'all'

  const setParam = (key, value) => {
    const next = new URLSearchParams(params)
    value === 'all' ? next.delete(key) : next.set(key, value)
    setParams(next, { replace: true })
  }

  const setViewMode = (v) => {
    setView(v)
    localStorage.setItem('fleetline:vview', v)
  }

  const list = useMemo(() => {
    const q = term.trim().toLowerCase()
    return withStats(vehicles, rentals)
      .filter((v) => (status === 'all' ? true : v.status === status))
      .filter(
        (v) =>
          !q ||
          v.name?.toLowerCase().includes(q) ||
          v.registrationNumber?.toLowerCase().includes(q)
      )
      .sort(SORTS[sort])
  }, [vehicles, rentals, term, status, sort])

  const confirmDelete = async () => {
    const target = toDelete
    if (!target) return
    setToDelete(null) // Instant modal close (0ms delay)

    // Remove from UI immediately
    const previous = removeVehicleOptimistic(target.id)

    try {
      await deleteVehicle(target.id)
      toast(`${target.name} deleted`)
    } catch (e) {
      restoreVehicle(previous)
      toast(`Couldn't delete: ${e.message}`, 'error')
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Vehicles</h1>
          <p>{vehicles.length} in the fleet · tap any vehicle for its full analytics</p>
        </div>
        <div className="head-actions">
          <div className="tabs desktop-only">
            <button className={`tab ${view === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}>
              <LayoutGrid size={14} style={{ verticalAlign: -2 }} /> Cards
            </button>
            <button className={`tab ${view === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')}>
              <List size={14} style={{ verticalAlign: -2 }} /> Table
            </button>
          </div>
          <Link to="/vehicles/new" className="btn btn-primary">
            <Plus size={15} /> Add vehicle
          </Link>
        </div>
      </div>

      <div className="filters">
        <SearchBar value={term} onChange={setTerm} placeholder="Search by name or plate" />
        <select className="select" value={status} onChange={(e) => setParam('status', e.target.value)} aria-label="Filter by status">
          <option value="all">Any status</option>
          <option value="available">Available</option>
          <option value="rented">On rent</option>
          <option value="maintenance">Maintenance</option>
        </select>
        <select className="select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort vehicles">
          <option value="revenue">Highest revenue</option>
          <option value="rentals">Most rentals</option>
          <option value="days">Most days out</option>
          <option value="pending">Largest balance</option>
          <option value="name">Name A–Z</option>
        </select>
      </div>

      {loading && vehicles.length === 0 ? (
        <SkeletonCards />
      ) : list.length === 0 ? (
        <section className="panel">
          <EmptyState
            icon={Car}
            title={vehicles.length ? 'Nothing matches those filters' : 'No vehicles yet'}
            body={
              vehicles.length
                ? 'Try a different status or search term.'
                : 'Add a vehicle to start tracking its rentals, earnings and balances.'
            }
            actionLabel={vehicles.length ? undefined : 'Add your first vehicle'}
            actionTo={vehicles.length ? undefined : '/vehicles/new'}
          />
        </section>
      ) : view === 'table' ? (
        <section className="panel">
          <VehicleTable vehicles={list} onEdit={(v) => navigate(`/vehicles/edit/${v.id}`)} onDelete={setToDelete} />
        </section>
      ) : (
        <div className="vehicle-grid">
          {list.map((v) => (
            <VehicleCard key={v.id} vehicle={v} onEdit={(x) => navigate(`/vehicles/edit/${x.id}`)} onDelete={setToDelete} />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        danger
        title={`Delete ${toDelete?.name}?`}
        body={`This removes the vehicle and every rental recorded against ${toDelete?.registrationNumber}. Its revenue disappears from your analytics. This can't be undone.`}
        confirmLabel="Delete vehicle"
        onCancel={() => setToDelete(null)}
        onConfirm={confirmDelete}
      />
    </>
  )
}
