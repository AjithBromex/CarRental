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
  const a = toDate(start)
  const b = toDate(end)
  if (!a || !b) return 0
  const ms = new Date(b.toDateString()) - new Date(a.toDateString())
  return Math.max(1, Math.round(ms / 86400000) + 1)
}

export const daysUntil = (value) => {
  const d = toDate(value)
  if (!d) return null
  return Math.round((new Date(d.toDateString()) - new Date(new Date().toDateString())) / 86400000)
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
