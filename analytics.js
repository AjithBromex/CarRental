import { toDate, monthKey, monthLabel, daysUntil } from './format'

/** Cancelled rentals never count towards money or usage. */
export const countsAsBusiness = (r) => r.status !== 'cancelled'

const blank = () => ({
  rentals: 0,
  days: 0,
  revenue: 0,
  paid: 0,
  balance: 0,
  activeRentals: 0,
  lastRentalAt: null,
})

/**
 * One pass over rentals -> per-vehicle totals.
 * Returns a Map keyed by vehicleId so lookups stay O(1) for every page.
 */
export function buildVehicleStats(rentals = []) {
  const map = new Map()
  for (const r of rentals) {
    if (!countsAsBusiness(r) || !r.vehicleId) continue
    const s = map.get(r.vehicleId) || blank()
    s.rentals += 1
    s.days += Number(r.days) || 0
    s.revenue += Number(r.totalAmount) || 0
    s.paid += Number(r.amountPaid) || 0
    s.balance += Math.max(0, (Number(r.totalAmount) || 0) - (Number(r.amountPaid) || 0))
    if (r.status === 'active') s.activeRentals += 1
    const start = toDate(r.startDate)
    if (start && (!s.lastRentalAt || start > s.lastRentalAt)) s.lastRentalAt = start
    map.set(r.vehicleId, s)
  }
  return map
}

export const statsFor = (map, vehicleId) => map.get(vehicleId) || blank()

/** Vehicles decorated with their stats, ready for tables and cards. */
export function withStats(vehicles = [], rentals = []) {
  const map = buildVehicleStats(rentals)
  return vehicles.map((v) => ({ ...v, stats: statsFor(map, v.id) }))
}

export function fleetTotals(vehicles = [], rentals = []) {
  const live = rentals.filter(countsAsBusiness)
  const revenue = live.reduce((t, r) => t + (Number(r.totalAmount) || 0), 0)
  const paid = live.reduce((t, r) => t + (Number(r.amountPaid) || 0), 0)
  return {
    totalVehicles: vehicles.length,
    rented: vehicles.filter((v) => v.status === 'rented').length,
    available: vehicles.filter((v) => v.status === 'available').length,
    maintenance: vehicles.filter((v) => v.status === 'maintenance').length,
    revenue,
    paid,
    pending: Math.max(0, revenue - paid),
    totalDays: live.reduce((t, r) => t + (Number(r.days) || 0), 0),
    totalRentals: live.length,
    activeRentals: rentals.filter((r) => r.status === 'active').length,
    completedRentals: rentals.filter((r) => r.status === 'completed').length,
    avgRentalValue: live.length ? revenue / live.length : 0,
    avgRentalDays: live.length
      ? live.reduce((t, r) => t + (Number(r.days) || 0), 0) / live.length
      : 0,
    collectionRate: revenue ? (paid / revenue) * 100 : 0,
    utilisation: vehicles.length
      ? (vehicles.filter((v) => v.status === 'rented').length / vehicles.length) * 100
      : 0,
  }
}

export const paymentStatus = (rental) => {
  const total = Number(rental.totalAmount) || 0
  const paid = Number(rental.amountPaid) || 0
  if (paid <= 0) return 'pending'
  if (paid >= total) return 'paid'
  return 'partial'
}

/** Revenue / rentals grouped by month, oldest first. */
export function monthlySeries(rentals = [], months = 6) {
  const buckets = new Map()
  const now = new Date()
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    buckets.set(monthKey(d), { key: monthKey(d), label: monthLabel(monthKey(d)), revenue: 0, paid: 0, pending: 0, rentals: 0, days: 0 })
  }
  for (const r of rentals) {
    if (!countsAsBusiness(r)) continue
    const d = toDate(r.startDate)
    if (!d) continue
    const b = buckets.get(monthKey(d))
    if (!b) continue
    const total = Number(r.totalAmount) || 0
    const paid = Number(r.amountPaid) || 0
    b.revenue += total
    b.paid += paid
    b.pending += Math.max(0, total - paid)
    b.rentals += 1
    b.days += Number(r.days) || 0
  }
  return [...buckets.values()]
}

/** Rentals started per day over the last N days. */
export function dailySeries(rentals = [], days = 14) {
  const buckets = new Map()
  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    buckets.set(key, {
      key,
      label: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      rentals: 0,
      revenue: 0,
    })
  }
  for (const r of rentals) {
    if (!countsAsBusiness(r)) continue
    const d = toDate(r.startDate)
    if (!d) continue
    const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0, 10)
    const b = buckets.get(key)
    if (!b) continue
    b.rentals += 1
    b.revenue += Number(r.totalAmount) || 0
  }
  return [...buckets.values()]
}

/** Rentals started per ISO week over the last N weeks. */
export function weeklySeries(rentals = [], weeks = 8) {
  const buckets = new Map()
  const now = new Date()
  const monday = (d) => {
    const c = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    c.setDate(c.getDate() - ((c.getDay() + 6) % 7))
    return c
  }
  for (let i = weeks - 1; i >= 0; i--) {
    const d = monday(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i * 7))
    const key = d.toISOString().slice(0, 10)
    buckets.set(key, {
      key,
      label: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      rentals: 0,
      revenue: 0,
    })
  }
  for (const r of rentals) {
    if (!countsAsBusiness(r)) continue
    const d = toDate(r.startDate)
    if (!d) continue
    const key = monday(d).toISOString().slice(0, 10)
    const b = buckets.get(key)
    if (!b) continue
    b.rentals += 1
    b.revenue += Number(r.totalAmount) || 0
  }
  return [...buckets.values()]
}

/** Group every rental by phone number -> one record per driver. */
export function buildDrivers(rentals = []) {
  const map = new Map()
  for (const r of rentals) {
    const key = (r.phoneNumber || r.driverName || 'unknown').trim()
    const d = map.get(key) || {
      key,
      name: r.driverName,
      phone: r.phoneNumber,
      rentals: [],
      total: 0,
      paid: 0,
      balance: 0,
      days: 0,
      locations: new Set(),
      vehicles: new Set(),
      lastRentalAt: null,
    }
    d.rentals.push(r)
    if (countsAsBusiness(r)) {
      d.total += Number(r.totalAmount) || 0
      d.paid += Number(r.amountPaid) || 0
      d.balance += Math.max(0, (Number(r.totalAmount) || 0) - (Number(r.amountPaid) || 0))
      d.days += Number(r.days) || 0
    }
    if (r.location) d.locations.add(r.location)
    if (r.vehicleName) d.vehicles.add(r.vehicleName)
    const start = toDate(r.startDate)
    if (start && (!d.lastRentalAt || start > d.lastRentalAt)) d.lastRentalAt = start
    d.name = d.name || r.driverName
    map.set(key, d)
  }
  return [...map.values()]
    .map((d) => ({
      ...d,
      locations: [...d.locations],
      vehicles: [...d.vehicles],
      rentals: d.rentals.sort((a, b) => (toDate(b.startDate) || 0) - (toDate(a.startDate) || 0)),
    }))
    .sort((a, b) => (b.lastRentalAt || 0) - (a.lastRentalAt || 0))
}

/** Things the owner should act on today. */
export function buildNotifications(vehicles = [], rentals = []) {
  const out = []

  for (const r of rentals.filter((x) => x.status === 'active')) {
    const left = daysUntil(r.endDate)
    if (left !== null && left < 0) {
      out.push({
        id: `overdue-${r.id}`,
        tone: 'red',
        icon: 'alert',
        title: `${r.vehicleName} is overdue`,
        body: `${r.driverName} was due back ${Math.abs(left)} day${Math.abs(left) === 1 ? '' : 's'} ago`,
        to: `/rentals?highlight=${r.id}`,
      })
    } else if (left !== null && left <= 2) {
      out.push({
        id: `ending-${r.id}`,
        tone: 'amber',
        icon: 'clock',
        title: `${r.vehicleName} returns ${left === 0 ? 'today' : `in ${left} day${left === 1 ? '' : 's'}`}`,
        body: `${r.driverName} · ${r.location || 'no location'}`,
        to: `/rentals?highlight=${r.id}`,
      })
    }
  }

  const owing = rentals.filter(
    (r) => countsAsBusiness(r) && (Number(r.totalAmount) || 0) - (Number(r.amountPaid) || 0) > 0
  )
  if (owing.length) {
    const sum = owing.reduce(
      (t, r) => t + ((Number(r.totalAmount) || 0) - (Number(r.amountPaid) || 0)),
      0
    )
    out.push({
      id: 'pending-total',
      tone: 'red',
      icon: 'money',
      title: `${owing.length} rental${owing.length === 1 ? '' : 's'} still owe money`,
      body: `₹${sum.toLocaleString('en-IN')} to collect`,
      to: '/payments',
    })
  }

  const idle = vehicles.filter((v) => v.status === 'available')
  if (idle.length) {
    out.push({
      id: 'idle',
      tone: 'green',
      icon: 'car',
      title: `${idle.length} vehicle${idle.length === 1 ? '' : 's'} ready to rent`,
      body: idle
        .slice(0, 3)
        .map((v) => v.name)
        .join(', ') + (idle.length > 3 ? ` +${idle.length - 3} more` : ''),
      to: '/vehicles?status=available',
    })
  }

  const inService = vehicles.filter((v) => v.status === 'maintenance')
  if (inService.length) {
    out.push({
      id: 'service',
      tone: 'amber',
      icon: 'wrench',
      title: `${inService.length} vehicle${inService.length === 1 ? '' : 's'} in maintenance`,
      body: inService.map((v) => v.registrationNumber).join(', '),
      to: '/vehicles?status=maintenance',
    })
  }

  return out
}
