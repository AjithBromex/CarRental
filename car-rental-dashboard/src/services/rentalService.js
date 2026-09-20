import {
  collection,
  doc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../firebase/firebaseConfig'
import { toDate, isRentalDueComplete } from '../utils/format'

export const rentalsRef = collection(db, 'rentals')

const clean = (r) => {
  const total = Number(r.totalAmount) || 0
  const paid = Number(r.amountPaid) || 0
  const data = {
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
    damageCost: Math.max(0, Number(r.damageCost) || 0),
    damageDescription: (r.damageDescription || r.damageNotes || '').trim(),
    notes: (r.notes || '').trim(),
    status: r.status || 'active',
  }
  if (r.manualStatus !== undefined) data.manualStatus = Boolean(r.manualStatus)
  if (r.autoCompleted !== undefined) data.autoCompleted = Boolean(r.autoCompleted)
  return data
}

/**
 * A rental and its vehicle's status always move together, so both writes go in
 * one batch — the fleet board can never drift out of sync with the rentals.
 */
const vehicleStatusFor = (rentalStatus) => (rentalStatus === 'active' ? 'rented' : 'available')

export const createRentalRef = () => doc(rentalsRef)

export const addRentalWithId = async (id, data) => {
  const payload = clean(data)
  const ref = doc(db, 'rentals', id)
  const batch = writeBatch(db)
  batch.set(ref, { ...payload, createdAt: serverTimestamp() })
  batch.update(doc(db, 'vehicles', payload.vehicleId), {
    status: vehicleStatusFor(payload.status),
    updatedAt: serverTimestamp(),
  })
  await batch.commit()
  return id
}

export const addRental = async (data) => {
  const payload = clean(data)
  const ref = doc(rentalsRef)
  const batch = writeBatch(db)
  batch.set(ref, { ...payload, createdAt: serverTimestamp() })
  batch.update(doc(db, 'vehicles', payload.vehicleId), {
    status: vehicleStatusFor(payload.status),
    updatedAt: serverTimestamp(),
  })
  await batch.commit()
  return ref.id
}

export const updateRental = async (id, data, previous) => {
  const payload = clean(data)
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
}

export const setRentalStatus = async (rental, status, isManual = false) => {
  const batch = writeBatch(db)
  const updateData = { status, updatedAt: serverTimestamp() }
  if (isManual) {
    updateData.manualStatus = status === 'active'
    if (status === 'active') {
      updateData.autoCompleted = false
    }
  }
  batch.update(doc(db, 'rentals', rental.id), updateData)
  if (rental.vehicleId) {
    batch.update(doc(db, 'vehicles', rental.vehicleId), {
      status: vehicleStatusFor(status),
      updatedAt: serverTimestamp(),
    })
  }
  await batch.commit()
}

/**
 * Automatically marks active rentals as 'completed' when their end date arrives or passes,
 * and sets the vehicle status back to 'available' if no other active rentals exist on it.
 */
export const autoCompleteDueRentals = async (rentals = [], vehicles = []) => {
  if (!Array.isArray(rentals) || rentals.length === 0) return []

  const due = rentals.filter(isRentalDueComplete)
  if (due.length === 0) return []

  const batch = writeBatch(db)
  const dueIds = new Set(due.map((r) => r.id))
  const vehicleIdsToCheck = new Set(due.map((r) => r.vehicleId).filter(Boolean))

  for (const r of due) {
    batch.update(doc(db, 'rentals', r.id), {
      status: 'completed',
      autoCompleted: true,
      updatedAt: serverTimestamp(),
    })
  }

  for (const vId of vehicleIdsToCheck) {
    const hasOtherActive = rentals.some(
      (other) => other.vehicleId === vId && other.status === 'active' && !dueIds.has(other.id)
    )
    if (!hasOtherActive) {
      batch.update(doc(db, 'vehicles', vId), {
        status: 'available',
        updatedAt: serverTimestamp(),
      })
    }
  }

  try {
    await batch.commit()
    return due
  } catch (err) {
    console.warn('Auto-complete due rentals sync error:', err.message)
    return []
  }
}

export const recordPayment = async (rental, amount) => {
  const total = Number(rental.totalAmount) || 0
  const paid = Math.min(total, (Number(rental.amountPaid) || 0) + Number(amount))
  const batch = writeBatch(db)
  batch.update(doc(db, 'rentals', rental.id), {
    amountPaid: paid,
    balance: Math.max(0, total - paid),
    updatedAt: serverTimestamp(),
  })
  await batch.commit()
}

export const deleteRental = async (rental) => {
  await deleteDoc(doc(db, 'rentals', rental.id))
  if (rental.status === 'active' && rental.vehicleId) {
    const batch = writeBatch(db)
    batch.update(doc(db, 'vehicles', rental.vehicleId), {
      status: 'available',
      updatedAt: serverTimestamp(),
    })
    await batch.commit()
  }
}

export const RENTAL_STATUSES = ['active', 'completed', 'cancelled']
