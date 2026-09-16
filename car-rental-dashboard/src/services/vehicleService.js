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
import { getLocalVehicles, saveLocalVehicles, getLocalRentals, saveLocalRentals } from './localStore'

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

export const addVehicle = async (data) => {
  const payload = clean(data)
  let id = 'veh-' + Date.now()
  try {
    const res = await addDoc(vehiclesRef, { ...payload, createdAt: serverTimestamp() })
    if (res?.id) id = res.id
  } catch (err) {
    console.warn('Firestore addVehicle notice:', err.message)
  }
  const current = getLocalVehicles()
  saveLocalVehicles([{ id, ...payload, createdAt: new Date().toISOString() }, ...current])
  return { id }
}

export const updateVehicle = async (id, data) => {
  const payload = clean(data)
  try {
    await updateDoc(doc(db, 'vehicles', id), { ...payload, updatedAt: serverTimestamp() })
  } catch (err) {
    console.warn('Firestore updateVehicle notice:', err.message)
  }
  const current = getLocalVehicles()
  saveLocalVehicles(current.map((v) => (v.id === id ? { ...v, ...payload, updatedAt: new Date().toISOString() } : v)))
}

export const setVehicleStatus = async (id, status) => {
  try {
    await updateDoc(doc(db, 'vehicles', id), { status, updatedAt: serverTimestamp() })
  } catch (err) {
    console.warn('Firestore setVehicleStatus notice:', err.message)
  }
  const current = getLocalVehicles()
  saveLocalVehicles(current.map((v) => (v.id === id ? { ...v, status, updatedAt: new Date().toISOString() } : v)))
}

/** Removes the vehicle and every rental attached to it, in one atomic batch. */
export const deleteVehicle = async (id) => {
  try {
    const attached = await getDocs(query(collection(db, 'rentals'), where('vehicleId', '==', id)))
    const batch = writeBatch(db)
    attached.forEach((d) => batch.delete(d.ref))
    batch.delete(doc(db, 'vehicles', id))
    await batch.commit()
  } catch (err) {
    console.warn('Firestore deleteVehicle notice:', err.message)
  }
  const currentVehicles = getLocalVehicles()
  saveLocalVehicles(currentVehicles.filter((v) => v.id !== id))
  const currentRentals = getLocalRentals()
  saveLocalRentals(currentRentals.filter((r) => r.vehicleId !== id))
  return 1
}

export const VEHICLE_TYPES = ['Hatchback', 'Sedan', 'SUV', 'MUV', 'Tempo Traveller', 'Pickup', 'Luxury']
export const VEHICLE_STATUSES = ['available', 'rented', 'maintenance']
