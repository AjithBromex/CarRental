import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase/firebaseConfig'

export const vehiclesRef = collection(db, 'vehicles')

const clean = (v) => ({
  name: v.name.trim(),
  model: (v.model || '').trim(),
  registrationNumber: v.registrationNumber.trim().toUpperCase(),
  image: (v.image || '').trim(),
  type: v.type || 'Sedan',
  year: Number(v.year) || new Date().getFullYear(),
  notes: (v.notes || '').trim(),
  status: v.status || 'available',
})

export const addVehicle = (data) =>
  addDoc(vehiclesRef, { ...clean(data), createdAt: serverTimestamp() })

export const updateVehicle = (id, data) =>
  updateDoc(doc(db, 'vehicles', id), { ...clean(data), updatedAt: serverTimestamp() })

export const setVehicleStatus = (id, status) =>
  updateDoc(doc(db, 'vehicles', id), { status, updatedAt: serverTimestamp() })

/** Removes the vehicle and every rental attached to it, in one atomic batch. */
export const deleteVehicle = async (id) => {
  const attached = await getDocs(query(collection(db, 'rentals'), where('vehicleId', '==', id)))
  const batch = writeBatch(db)
  attached.forEach((d) => batch.delete(d.ref))
  batch.delete(doc(db, 'vehicles', id))
  await batch.commit()
  return attached.size
}

export const VEHICLE_TYPES = ['Hatchback', 'Sedan', 'SUV', 'MUV', 'Tempo Traveller', 'Pickup', 'Luxury']
export const VEHICLE_STATUSES = ['available', 'rented', 'maintenance']
