const VEHICLES_KEY = 'fleetline:vehicles'
const RENTALS_KEY = 'fleetline:rentals'
const CHANGE_EVENT = 'fleetline:datachange'

const INITIAL_VEHICLES = [
  {
    id: 'veh-1',
    name: 'Mahindra Thar 4x4',
    model: 'LX Hard Top Diesel',
    registrationNumber: 'MH 02 AB 1234',
    type: 'SUV',
    year: 2023,
    status: 'rented',
    image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=600&q=80',
    notes: 'Equipped with GPS tracker and all-terrain kit.',
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'veh-2',
    name: 'Toyota Innova Crysta',
    model: '2.4 ZX 7 STR',
    registrationNumber: 'MH 01 CD 5678',
    type: 'MUV',
    year: 2022,
    status: 'available',
    image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80',
    notes: 'Premium family tourer with captain seats.',
    createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'veh-3',
    name: 'Hyundai Creta',
    model: 'SX (O) Turbo Petrol',
    registrationNumber: 'MH 04 EF 9012',
    type: 'SUV',
    year: 2023,
    status: 'available',
    image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=600&q=80',
    notes: 'Panoramic sunroof, dashcam installed.',
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'veh-4',
    name: 'Maruti Suzuki Swift',
    model: 'ZXi+ AMT',
    registrationNumber: 'MH 03 GH 3456',
    type: 'Hatchback',
    year: 2021,
    status: 'maintenance',
    image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=600&q=80',
    notes: 'Scheduled for 40,000 km brake pad replacement.',
    createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

const now = new Date()
const startOfActive = new Date(now.getTime() - 2 * 86400000)
const endOfActive = new Date(now.getTime() + 3 * 86400000)
const pastStart1 = new Date(now.getTime() - 15 * 86400000)
const pastEnd1 = new Date(now.getTime() - 11 * 86400000)
const pastStart2 = new Date(now.getTime() - 8 * 86400000)
const pastEnd2 = new Date(now.getTime() - 6 * 86400000)

const INITIAL_RENTALS = [
  {
    id: 'rent-1',
    vehicleId: 'veh-1',
    vehicleName: 'Mahindra Thar 4x4',
    registrationNumber: 'MH 02 AB 1234',
    driverName: 'Rajesh Sharma',
    phoneNumber: '+91 98201 12345',
    location: 'Mumbai Airport Terminal 2',
    startDate: startOfActive.toISOString(),
    endDate: endOfActive.toISOString(),
    days: 5,
    totalAmount: 17500,
    amountPaid: 17500,
    balance: 0,
    notes: 'Self-drive weekend trip to Lonavala.',
    status: 'active',
    createdAt: startOfActive.toISOString(),
  },
  {
    id: 'rent-2',
    vehicleId: 'veh-2',
    vehicleName: 'Toyota Innova Crysta',
    registrationNumber: 'MH 01 CD 5678',
    driverName: 'Amit Verma',
    phoneNumber: '+91 98765 43210',
    location: 'Bandra West, Mumbai',
    startDate: pastStart1.toISOString(),
    endDate: pastEnd1.toISOString(),
    days: 4,
    totalAmount: 16000,
    amountPaid: 12000,
    balance: 4000,
    notes: 'Family trip to Shirdi. Balance pending on return.',
    status: 'completed',
    createdAt: pastStart1.toISOString(),
  },
  {
    id: 'rent-3',
    vehicleId: 'veh-3',
    vehicleName: 'Hyundai Creta',
    registrationNumber: 'MH 04 EF 9012',
    driverName: 'Pooja Nair',
    phoneNumber: '+91 98112 34567',
    location: 'BKC, Mumbai',
    startDate: pastStart2.toISOString(),
    endDate: pastEnd2.toISOString(),
    days: 2,
    totalAmount: 7000,
    amountPaid: 7000,
    balance: 0,
    notes: 'Corporate client local commute.',
    status: 'completed',
    createdAt: pastStart2.toISOString(),
  },
]

export function getLocalVehicles() {
  const raw = localStorage.getItem(VEHICLES_KEY)
  if (!raw) {
    localStorage.setItem(VEHICLES_KEY, JSON.stringify(INITIAL_VEHICLES))
    return INITIAL_VEHICLES
  }
  try {
    return JSON.parse(raw)
  } catch {
    return INITIAL_VEHICLES
  }
}

export function saveLocalVehicles(vehicles) {
  localStorage.setItem(VEHICLES_KEY, JSON.stringify(vehicles))
  notifyChange()
}

export function getLocalRentals() {
  const raw = localStorage.getItem(RENTALS_KEY)
  if (!raw) {
    localStorage.setItem(RENTALS_KEY, JSON.stringify(INITIAL_RENTALS))
    return INITIAL_RENTALS
  }
  try {
    return JSON.parse(raw)
  } catch {
    return INITIAL_RENTALS
  }
}

export function saveLocalRentals(rentals) {
  localStorage.setItem(RENTALS_KEY, JSON.stringify(rentals))
  notifyChange()
}

export function notifyChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT))
  }
}

export function subscribeLocalChanges(callback) {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(CHANGE_EVENT, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback)
    window.removeEventListener('storage', callback)
  }
}
