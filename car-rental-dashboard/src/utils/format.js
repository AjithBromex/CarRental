export const inr = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(n) || 0)

export const inrShort = (n) => {
  const v = Number(n) || 0
  if (Math.abs(v) >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`
  if (Math.abs(v) >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`
  if (Math.abs(v) >= 1000) return `₹${(v / 1000).toFixed(1)}k`
  return `₹${v}`
}

export const num = (n) => new Intl.NumberFormat('en-IN').format(Number(n) || 0)

/** Firestore Timestamp | ISO string | Date -> Date */
export const toDate = (value) => {
  if (!value) return null
  if (typeof value?.toDate === 'function') return value.toDate()
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export const fmtDate = (value) => {
  const d = toDate(value)
  return d
    ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'
}

export const fmtDateShort = (value) => {
  const d = toDate(value)
  return d ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'
}

/** yyyy-mm-dd for <input type="date"> */
export const inputDate = (value) => {
  const d = toDate(value)
  if (!d) return ''
  const tz = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return tz.toISOString().slice(0, 10)
}

export const daysBetween = (start, end) => {
  if (
    typeof start === 'string' &&
    typeof end === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(start) &&
    /^\d{4}-\d{2}-\d{2}$/.test(end)
  ) {
    const [y1, m1, d1] = start.split('-').map(Number)
    const [y2, m2, d2] = end.split('-').map(Number)
    const t1 = Date.UTC(y1, m1 - 1, d1)
    const t2 = Date.UTC(y2, m2 - 1, d2)
    return Math.max(1, Math.round((t2 - t1) / 86400000) + 1)
  }
  const a = toDate(start)
  const b = toDate(end)
  if (!a || !b) return 0
  const ms = new Date(b.toDateString()) - new Date(a.toDateString())
  return Math.max(1, Math.round(ms / 86400000) + 1)
}

/** Calculate end date (yyyy-mm-dd) given start date and duration in days (inclusive) */
export const addDays = (startDate, numDays) => {
  if (!startDate) return ''
  const count = parseInt(numDays, 10)
  if (isNaN(count) || count < 1) return ''

  if (typeof startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    const [y, m, d] = startDate.split('-').map(Number)
    const target = new Date(y, m - 1, d + (count - 1))
    const resY = target.getFullYear()
    const resM = String(target.getMonth() + 1).padStart(2, '0')
    const resD = String(target.getDate()).padStart(2, '0')
    return `${resY}-${resM}-${resD}`
  }

  const dt = toDate(startDate)
  if (!dt) return ''
  const target = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() + (count - 1))
  const resY = target.getFullYear()
  const resM = String(target.getMonth() + 1).padStart(2, '0')
  const resD = String(target.getDate()).padStart(2, '0')
  return `${resY}-${resM}-${resD}`
}

export const toLocalDateString = (value) => {
  if (!value) return ''
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value
  }
  const d = toDate(value)
  if (!d) return ''
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const getTodayDateString = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Check if an active rental has reached or passed its end date */
export const isRentalDueComplete = (rental) => {
  if (!rental || rental.status !== 'active') return false
  if (rental.manualStatus) return false
  const endStr = toLocalDateString(rental.endDate)
  const todayStr = getTodayDateString()
  return Boolean(endStr && endStr <= todayStr)
}

export const daysUntil = (value) => {
  const endStr = toLocalDateString(value)
  const todayStr = getTodayDateString()
  if (!endStr || !todayStr) return null
  const [y1, m1, d1] = endStr.split('-').map(Number)
  const [y2, m2, d2] = todayStr.split('-').map(Number)
  const t1 = Date.UTC(y1, m1 - 1, d1)
  const t2 = Date.UTC(y2, m2 - 1, d2)
  return Math.round((t1 - t2) / 86400000)
}

export const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

export const monthLabel = (key) => {
  const [y, m] = key.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-IN', {
    month: 'short',
    year: '2-digit',
  })
}

export const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '?'

export const phoneDigits = (p = '') => p.replace(/\D/g, '')

export const isValidPhone = (p = '') => /^[0-9]{10}$/.test(phoneDigits(p).slice(-10)) && phoneDigits(p).length >= 10
