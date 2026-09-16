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

export const setRentalStatus = async (rental, status) => {
  const batch = writeBatch(db)
  batch.update(doc(db, 'rentals', rental.id), { status, updatedAt: serverTimestamp() })
  if (rental.vehicleId) {
    batch.update(doc(db, 'vehicles', rental.vehicleId), {
      status: vehicleStatusFor(status),
      updatedAt: serverTimestamp(),
    })
  }
  await batch.commit()
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
