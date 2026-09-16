import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { onSnapshot, query, orderBy } from 'firebase/firestore'
import { vehiclesRef } from '../services/vehicleService'
import { rentalsRef } from '../services/rentalService'
import { useAuth } from './AuthContext'
import { buildNotifications, buildVehicleStats, fleetTotals } from '../utils/analytics'
import {
  getLocalVehicles,
  getLocalRentals,
  subscribeLocalChanges,
  saveLocalVehicles,
  saveLocalRentals,
} from '../services/localStore'
import { isConfigured } from '../firebase/firebaseConfig'

const DataContext = createContext(null)

/**
 * DataProvider provides real-time fleet data with seamless local fallback.
 * Works immediately with default demo fleet data and syncs with Firestore
 * when connected.
 */
export function DataProvider({ children }) {
  const { user } = useAuth()
  const [vehicles, setVehicles] = useState(() => getLocalVehicles())
  const [rentals, setRentals] = useState(() => getLocalRentals())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) {
      setVehicles([])
      setRentals([])
      setLoading(false)
      return
    }

    // Always start with available local data so the dashboard is immediately populated
    setVehicles(getLocalVehicles())
    setRentals(getLocalRentals())
    setLoading(false)

    // Listen for local updates (when user adds/edits/deletes vehicles or rentals)
    const unsubLocal = subscribeLocalChanges(() => {
      setVehicles(getLocalVehicles())
      setRentals(getLocalRentals())
    })

    // If Firebase is not configured or user is in local admin mode, local storage is used
    if (!isConfigured || user.uid === 'admin-local') {
      return unsubLocal
    }

    let unsubVehicles = () => {}
    let unsubRentals = () => {}

    try {
      unsubVehicles = onSnapshot(
        query(vehiclesRef, orderBy('createdAt', 'desc')),
        (snap) => {
          if (!snap.empty) {
            const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
            setVehicles(list)
            saveLocalVehicles(list)
          }
        },
        (e) => {
          console.warn('Firestore vehicles sync notice:', e.message)
        }
      )

      unsubRentals = onSnapshot(
        query(rentalsRef, orderBy('startDate', 'desc')),
        (snap) => {
          if (!snap.empty) {
            const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
            setRentals(list)
            saveLocalRentals(list)
          }
        },
        (e) => {
          console.warn('Firestore rentals sync notice:', e.message)
        }
      )
    } catch (e) {
      console.warn('Firestore listener setup notice:', e.message)
    }

    return () => {
      unsubLocal()
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
