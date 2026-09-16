import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { onSnapshot, query, orderBy } from 'firebase/firestore'
import { vehiclesRef } from '../services/vehicleService'
import { rentalsRef } from '../services/rentalService'
import { useAuth } from './AuthContext'
import { buildNotifications, buildVehicleStats, fleetTotals } from '../utils/analytics'

const DataContext = createContext(null)

/**
 * One pair of Firestore listeners for the whole app.
 * Directly listens to your real Firestore database in real-time with
 * instant optimistic updates so adding & deleting have zero lag.
 */
export function DataProvider({ children }) {
  const { user } = useAuth()
  const [vehicles, setVehicles] = useState([])
  const [rentals, setRentals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) {
      setVehicles([])
      setRentals([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    let gotVehicles = false
    let gotRentals = false
    const done = () => {
      if (gotVehicles && gotRentals) setLoading(false)
    }

    const unsubVehicles = onSnapshot(
      query(vehiclesRef, orderBy('createdAt', 'desc')),
      (snap) => {
        setVehicles(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
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
        setRentals(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
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
      unsubVehicles()
      unsubRentals()
    }
  }, [user])

  // Instant optimistic actions
  const removeVehicleOptimistic = useCallback((id) => {
    let removed = null
    setVehicles((prev) => {
      removed = prev.find((v) => v.id === id)
      return prev.filter((v) => v.id !== id)
    })
    setRentals((prev) => prev.filter((r) => r.vehicleId !== id))
    return removed
  }, [])

  const restoreVehicle = useCallback((vehicle) => {
    if (vehicle) {
      setVehicles((prev) => [vehicle, ...prev.filter((v) => v.id !== vehicle.id)])
    }
  }, [])

  const addVehicleOptimistic = useCallback((newVeh) => {
    setVehicles((prev) => [newVeh, ...prev.filter((v) => v.id !== newVeh.id)])
  }, [])

  const updateVehicleOptimistic = useCallback((id, patch) => {
    setVehicles((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v)))
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
  ])

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export const useData = () => useContext(DataContext)
