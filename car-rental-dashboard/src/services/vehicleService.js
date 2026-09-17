import {
  collection,
  doc,
  addDoc,
  setDoc,
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

const clean = (v) => {
  const data = {
    name: v.name.trim(),
    registrationNumber: v.registrationNumber.trim().toUpperCase(),
    image: (v.image || '').trim(),
    year: Number(v.year) || new Date().getFullYear(),
    notes: (v.notes || '').trim(),
    status: v.status || 'available',
  }
  if (v.model) data.model = v.model.trim()
  if (v.type) data.type = v.type.trim()
  return data
}

export const createVehicleRef = () => doc(vehiclesRef)

export const addVehicleWithId = (id, data) =>
  setDoc(doc(db, 'vehicles', id), { ...clean(data), createdAt: serverTimestamp() })

export const addVehicle = async (data) => {
  const newRef = doc(vehiclesRef)
  await setDoc(newRef, { ...clean(data), createdAt: serverTimestamp() })
  return newRef
}

export const updateVehicle = (id, data) =>
  updateDoc(doc(db, 'vehicles', id), { ...clean(data), updatedAt: serverTimestamp() })

export const setVehicleStatus = (id, status) =>
  updateDoc(doc(db, 'vehicles', id), { status, updatedAt: serverTimestamp() })

/** Removes the vehicle instantly and cleans up any attached rentals */
export const deleteVehicle = async (id) => {
  // Delete the vehicle doc directly
  await deleteDoc(doc(db, 'vehicles', id))

  // Clean up any associated rentals in the background
  try {
    const attached = await getDocs(query(collection(db, 'rentals'), where('vehicleId', '==', id)))
    if (!attached.empty) {
      const batch = writeBatch(db)
      attached.forEach((d) => batch.delete(d.ref))
      await batch.commit()
    }
  } catch (err) {
    console.warn('Attached rentals cleanup notice:', err.message)
  }
}

export const VEHICLE_TYPES = ['Hatchback', 'Sedan', 'SUV', 'MUV', 'Tempo Traveller', 'Pickup', 'Luxury']
export const VEHICLE_STATUSES = ['available', 'rented', 'maintenance']
