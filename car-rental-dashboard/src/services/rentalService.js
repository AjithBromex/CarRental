import {
  collection,
  doc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../firebase/firebaseConfig'
import { toDate } from '../utils/format'
import {
  getLocalRentals,
  saveLocalRentals,
  getLocalVehicles,
  saveLocalVehicles,
} from './localStore'

export const rentalsRef = collection(db, 'rentals')

const clean = (r) => {
  const total = Number(r.totalAmount) || 0
  const paid = Number(r.amountPaid) || 0
  return {
    vehicleId: r.vehicleId,
    vehicleName: (r.vehicleName || '').trim(),
    registrationNumber: (r.registrationNumber || '').trim().toUpperCase(),
    driverName: r.driverName.trim(),
    phoneNumber: (r.phoneNumber || '').trim(),
    location: (r.location || '').trim(),
    startDate: Timestamp.fromDate(toDate(r.startDate)),
    endDate: Timestamp.fromDate(toDate(r.endDate)),
    days: Number(r.days) || 1,
    totalAmount: total,
    amountPaid: paid,
    balance: Math.max(0, total - paid),
    notes: (r.notes || '').trim(),
    status: r.status || 'active',
  }
}

/**
 * A rental and its vehicle's status always move together, so both writes go in
 * one batch — the fleet board can never drift out of sync with the rentals.
 */
const vehicleStatusFor = (rentalStatus) => (rentalStatus === 'active' ? 'rented' : 'available')

export const addRental = async (data) => {
  const payload = clean(data)
  let id = 'rent-' + Date.now()
  try {
    const ref = doc(rentalsRef)
    id = ref.id
    const batch = writeBatch(db)
    batch.set(ref, { ...payload, createdAt: serverTimestamp() })
    batch.update(doc(db, 'vehicles', payload.vehicleId), {
      status: vehicleStatusFor(payload.status),
      updatedAt: serverTimestamp(),
    })
    await batch.commit()
  } catch (err) {
    console.warn('Firestore addRental notice:', err.message)
  }

  // Update local storage
  const currentRentals = getLocalRentals()
  const localStartDate = toDate(data.startDate)?.toISOString() || new Date().toISOString()
  const localEndDate = toDate(data.endDate)?.toISOString() || new Date().toISOString()
  saveLocalRentals([
    {
      id,
      ...payload,
      startDate: localStartDate,
      endDate: localEndDate,
      createdAt: new Date().toISOString(),
    },
    ...currentRentals,
  ])

  // Update vehicle status in local storage
  const currentVehicles = getLocalVehicles()
  saveLocalVehicles(
    currentVehicles.map((v) =>
      v.id === payload.vehicleId
        ? { ...v, status: vehicleStatusFor(payload.status), updatedAt: new Date().toISOString() }
        : v
    )
  )

  return id
}

export const updateRental = async (id, data, previous) => {
  const payload = clean(data)
  try {
    const batch = writeBatch(db)
    batch.update(doc(db, 'rentals', id), { ...payload, updatedAt: serverTimestamp() })

    // If the rental moved to another vehicle, free the old one first.
    if (previous?.vehicleId && previous.vehicleId !== payload.vehicleId) {
      batch.update(doc(db, 'vehicles', previous.vehicleId), {
        status: 'available',
        updatedAt: serverTimestamp(),
      })
    }
    batch.update(doc(db, 'vehicles', payload.vehicleId), {
      status: vehicleStatusFor(payload.status),
      updatedAt: serverTimestamp(),
    })
    await batch.commit()
  } catch (err) {
    console.warn('Firestore updateRental notice:', err.message)
  }

  const currentRentals = getLocalRentals()
  const localStartDate = toDate(data.startDate)?.toISOString() || new Date().toISOString()
  const localEndDate = toDate(data.endDate)?.toISOString() || new Date().toISOString()
  saveLocalRentals(
    currentRentals.map((r) =>
      r.id === id
        ? {
            ...r,
            ...payload,
            startDate: localStartDate,
            endDate: localEndDate,
            updatedAt: new Date().toISOString(),
          }
        : r
    )
  )

  const currentVehicles = getLocalVehicles()
  saveLocalVehicles(
    currentVehicles.map((v) => {
      if (previous?.vehicleId && previous.vehicleId !== payload.vehicleId && v.id === previous.vehicleId) {
        return { ...v, status: 'available', updatedAt: new Date().toISOString() }
      }
      if (v.id === payload.vehicleId) {
        return { ...v, status: vehicleStatusFor(payload.status), updatedAt: new Date().toISOString() }
      }
      return v
    })
  )
}

export const setRentalStatus = async (rental, status) => {
  try {
    const batch = writeBatch(db)
    batch.update(doc(db, 'rentals', rental.id), { status, updatedAt: serverTimestamp() })
    if (rental.vehicleId) {
      batch.update(doc(db, 'vehicles', rental.vehicleId), {
        status: vehicleStatusFor(status),
        updatedAt: serverTimestamp(),
      })
    }
    await batch.commit()
  } catch (err) {
    console.warn('Firestore setRentalStatus notice:', err.message)
  }

  const currentRentals = getLocalRentals()
  saveLocalRentals(
    currentRentals.map((r) =>
      r.id === rental.id ? { ...r, status, updatedAt: new Date().toISOString() } : r
    )
  )

  if (rental.vehicleId) {
    const currentVehicles = getLocalVehicles()
    saveLocalVehicles(
      currentVehicles.map((v) =>
        v.id === rental.vehicleId
          ? { ...v, status: vehicleStatusFor(status), updatedAt: new Date().toISOString() }
          : v
      )
    )
  }
}

export const recordPayment = async (rental, amount) => {
  const total = Number(rental.totalAmount) || 0
  const paid = Math.min(total, (Number(rental.amountPaid) || 0) + Number(amount))
  const balance = Math.max(0, total - paid)

  try {
    const batch = writeBatch(db)
    batch.update(doc(db, 'rentals', rental.id), {
      amountPaid: paid,
      balance,
      updatedAt: serverTimestamp(),
    })
    await batch.commit()
  } catch (err) {
    console.warn('Firestore recordPayment notice:', err.message)
  }

  const currentRentals = getLocalRentals()
  saveLocalRentals(
    currentRentals.map((r) =>
      r.id === rental.id
        ? { ...r, amountPaid: paid, balance, updatedAt: new Date().toISOString() }
        : r
    )
  )
}

export const deleteRental = async (rental) => {
  try {
    await deleteDoc(doc(db, 'rentals', rental.id))
    if (rental.status === 'active' && rental.vehicleId) {
      const batch = writeBatch(db)
      batch.update(doc(db, 'vehicles', rental.vehicleId), {
        status: 'available',
        updatedAt: serverTimestamp(),
      })
      await batch.commit()
    }
  } catch (err) {
    console.warn('Firestore deleteRental notice:', err.message)
  }

  const currentRentals = getLocalRentals()
  saveLocalRentals(currentRentals.filter((r) => r.id !== rental.id))

  if (rental.status === 'active' && rental.vehicleId) {
    const currentVehicles = getLocalVehicles()
    saveLocalVehicles(
      currentVehicles.map((v) =>
        v.id === rental.vehicleId
          ? { ...v, status: 'available', updatedAt: new Date().toISOString() }
          : v
      )
    )
  }
}

export const RENTAL_STATUSES = ['active', 'completed', 'cancelled']
