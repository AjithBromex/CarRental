import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { onSnapshot, query, orderBy } from 'firebase/firestore'
import { vehiclesRef } from '../services/vehicleService'
import { rentalsRef } from '../services/rentalService'
import { useAuth } from './AuthContext'
import { buildNotifications, buildVehicleStats, fleetTotals } from '../utils/analytics'

const DataContext = createContext(null)

const VEHICLES_CACHE_KEY = 'fleetline:cache:vehicles'
const RENTALS_CACHE_KEY = 'fleetline:cache:rentals'

const loadCached = (key) => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const saveCache = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch {
    // ignore
  }
}

/**
 * One pair of Firestore listeners for the whole app.
 * Directly listens to your real Firestore database in real-time with
 * instant optimistic updates and local cache hydration so there is zero login lag.
 */
export function DataProvider({ children }) {
  const { user } = useAuth()
  const cachedVehicles = useMemo(() => loadCached(VEHICLES_CACHE_KEY), [])
  const cachedRentals = useMemo(() => loadCached(RENTALS_CACHE_KEY), [])

  // Instantly hydrate from cache if available so dashboard renders immediately in 0ms
  const [vehicles, setVehicles] = useState(() => cachedVehicles || [])
  const [rentals, setRentals] = useState(() => cachedRentals || [])
  const [loading, setLoading] = useState(() => !Boolean(cachedVehicles && cachedRentals))
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) {
      setVehicles([])
      setRentals([])
      setLoading(false)
      return
    }

    const hasCached = Boolean(loadCached(VEHICLES_CACHE_KEY) && loadCached(RENTALS_CACHE_KEY))
    if (!hasCached) {
      setLoading(true)
    }
    setError(null)

    let gotVehicles = false
    let gotRentals = false
    const done = () => {
      if (gotVehicles && gotRentals) setLoading(false)
    }

    // Safety timeout: If Firestore connection or query takes longer than 1500ms,
    // clear the blocking loading state so the user can interact immediately.
    const safetyTimer = setTimeout(() => {
      setLoading(false)
    }, 1500)

    const unsubVehicles = onSnapshot(
      query(vehiclesRef, orderBy('createdAt', 'desc')),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        setVehicles(list)
        saveCache(VEHICLES_CACHE_KEY, list)
        gotVehicles = true
        done()
      },
      (e) => {
        console.warn('Firestore vehicles listener error:', e.message)
        setError(e.message)
        gotVehicles = true
        done()
      }
    )

    const unsubRentals = onSnapshot(
      query(rentalsRef, orderBy('startDate', 'desc')),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        setRentals(list)
        saveCache(RENTALS_CACHE_KEY, list)
        gotRentals = true
        done()
      },
      (e) => {
        console.warn('Firestore rentals listener error:', e.message)
        setError(e.message)
        gotRentals = true
        done()
      }
    )

    return () => {
      clearTimeout(safetyTimer)
      unsubVehicles()
      unsubRentals()
    }
  }, [user])

  // Instant optimistic actions with cache persistence
  const removeVehicleOptimistic = useCallback((id) => {
    let removed = null
    setVehicles((prev) => {
      removed = prev.find((v) => v.id === id)
      const next = prev.filter((v) => v.id !== id)
      saveCache(VEHICLES_CACHE_KEY, next)
      return next
    })
    setRentals((prev) => {
      const next = prev.filter((r) => r.vehicleId !== id)
      saveCache(RENTALS_CACHE_KEY, next)
      return next
    })
    return removed
  }, [])

  const restoreVehicle = useCallback((vehicle) => {
    if (vehicle) {
      setVehicles((prev) => {
        const next = [vehicle, ...prev.filter((v) => v.id !== vehicle.id)]
        saveCache(VEHICLES_CACHE_KEY, next)
        return next
      })
    }
  }, [])

  const addVehicleOptimistic = useCallback((newVeh) => {
    setVehicles((prev) => {
      const next = [newVeh, ...prev.filter((v) => v.id !== newVeh.id)]
      saveCache(VEHICLES_CACHE_KEY, next)
      return next
    })
  }, [])

  const updateVehicleOptimistic = useCallback((id, patch) => {
    setVehicles((prev) => {
      const next = prev.map((v) => (v.id === id ? { ...v, ...patch } : v))
      saveCache(VEHICLES_CACHE_KEY, next)
      return next
    })
  }, [])

  // Instant optimistic actions for rentals with automatic fleet status updates
  const addRentalOptimistic = useCallback((newRental) => {
    setRentals((prev) => {
      const next = [newRental, ...prev.filter((r) => r.id !== newRental.id)]
      saveCache(RENTALS_CACHE_KEY, next)
      return next
    })
    if (newRental.vehicleId) {
      setVehicles((prev) => {
        const next = prev.map((v) =>
          v.id === newRental.vehicleId
            ? { ...v, status: newRental.status === 'active' ? 'rented' : 'available' }
            : v
        )
        saveCache(VEHICLES_CACHE_KEY, next)
        return next
      })
    }
  }, [])

  const updateRentalOptimistic = useCallback((id, patch, previous) => {
    setRentals((prev) => {
      const next = prev.map((r) => (r.id === id ? { ...r, ...patch } : r))
      saveCache(RENTALS_CACHE_KEY, next)
      return next
    })
    if (patch.vehicleId || patch.status) {
      setVehicles((prev) => {
        const next = prev.map((v) => {
          if (previous?.vehicleId && v.id === previous.vehicleId && previous.vehicleId !== patch.vehicleId) {
            return { ...v, status: 'available' }
          }
          if (v.id === (patch.vehicleId || previous?.vehicleId)) {
            const nextStatus = patch.status === 'active' ? 'rented' : 'available'
            return { ...v, status: nextStatus }
          }
          return v
        })
        saveCache(VEHICLES_CACHE_KEY, next)
        return next
      })
    }
  }, [])

  const removeRentalOptimistic = useCallback((id, vehicleId) => {
    let removed = null
    setRentals((prev) => {
      removed = prev.find((r) => r.id === id)
      const next = prev.filter((r) => r.id !== id)
      saveCache(RENTALS_CACHE_KEY, next)
      return next
    })
    if (vehicleId) {
      setVehicles((prev) => {
        const next = prev.map((v) => (v.id === vehicleId ? { ...v, status: 'available' } : v))
        saveCache(VEHICLES_CACHE_KEY, next)
        return next
      })
    }
    return removed
  }, [])

  const value = useMemo(() => {
    const statsByVehicle = buildVehicleStats(rentals)
    return {
      vehicles,
      rentals,
      loading,
      error,
      statsByVehicle,
      totals: fleetTotals(vehicles, rentals),
      notifications: buildNotifications(vehicles, rentals),
      vehicleById: (id) => vehicles.find((v) => v.id === id),
      rentalsForVehicle: (id) => rentals.filter((r) => r.vehicleId === id),
      removeVehicleOptimistic,
      restoreVehicle,
      addVehicleOptimistic,
      updateVehicleOptimistic,
      addRentalOptimistic,
      updateRentalOptimistic,
      removeRentalOptimistic,
    }
  }, [
    vehicles,
    rentals,
    loading,
    error,
    removeVehicleOptimistic,
    restoreVehicle,
    addVehicleOptimistic,
    updateVehicleOptimistic,
    addRentalOptimistic,
    updateRentalOptimistic,
    removeRentalOptimistic,
  ])

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export const useData = () => useContext(DataContext)
