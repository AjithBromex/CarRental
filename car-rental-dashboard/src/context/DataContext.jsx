import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { onSnapshot, query, orderBy } from 'firebase/firestore'
import { vehiclesRef } from '../services/vehicleService'
import { rentalsRef } from '../services/rentalService'
import { useAuth } from './AuthContext'
import { buildNotifications, buildVehicleStats, fleetTotals } from '../utils/analytics'

const DataContext = createContext(null)

/**
 * One pair of Firestore listeners for the whole app. Every page reads from this
 * cache instead of re-querying, so charts and tables update the moment a write
 * lands — and we never fetch the same collection twice.
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
    let gotVehicles = false
    let gotRentals = false
    const done = () => gotVehicles && gotRentals && setLoading(false)

    const unsubVehicles = onSnapshot(
      query(vehiclesRef, orderBy('createdAt', 'desc')),
      (snap) => {
        setVehicles(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
        gotVehicles = true
        done()
      },
      (e) => {
        setError(e.message)
        setLoading(false)
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
        setError(e.message)
        setLoading(false)
      }
    )

    return () => {
      unsubVehicles()
      unsubRentals()
    }
  }, [user])

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
    }
  }, [vehicles, rentals, loading, error])

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export const useData = () => useContext(DataContext)
