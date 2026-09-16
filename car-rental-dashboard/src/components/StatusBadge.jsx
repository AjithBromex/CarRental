const VEHICLE = {
  available: { tone: 'green', label: 'Available' },
  rented: { tone: 'blue', label: 'On rent' },
  maintenance: { tone: 'amber', label: 'Maintenance' },
}

const RENTAL = {
  active: { tone: 'blue', label: 'Active' },
  completed: { tone: 'green', label: 'Completed' },
  cancelled: { tone: 'grey', label: 'Cancelled' },
}

const PAYMENT = {
  paid: { tone: 'green', label: 'Fully paid' },
  partial: { tone: 'amber', label: 'Part paid' },
  pending: { tone: 'red', label: 'Unpaid' },
}

const MAPS = { vehicle: VEHICLE, rental: RENTAL, payment: PAYMENT }

export default function StatusBadge({ kind = 'vehicle', status }) {
  const meta = MAPS[kind]?.[status] || { tone: 'grey', label: status || 'Unknown' }
  return <span className={`badge ${meta.tone}`}>{meta.label}</span>
}
