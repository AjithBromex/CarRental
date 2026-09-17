import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Car, User, CalendarDays, IndianRupee, AlertCircle, Save, RotateCcw } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { Spinner } from '../components/Loading'
import Plate from '../components/Plate'
import StatusBadge from '../components/StatusBadge'
import { addRental, addRentalWithId, createRentalRef, updateRental } from '../services/rentalService'
import { inr, inputDate, daysBetween, isValidPhone, phoneDigits } from '../utils/format'

const today = () => inputDate(new Date())

const BLANK = {
  vehicleId: '',
  driverName: '',
  phoneNumber: '',
  location: '',
  startDate: today(),
  endDate: today(),
  days: '1',
  totalAmount: '',
  amountPaid: '',
  notes: '',
  status: 'active',
}

function validate(form) {
  const e = {}
  const total = Number(form.totalAmount)
  const paid = Number(form.amountPaid || 0)

  if (!form.vehicleId) e.vehicleId = 'Pick the vehicle going out'
  if (!form.driverName.trim()) e.driverName = 'Driver name is required'
  if (!form.phoneNumber.trim()) e.phoneNumber = 'Phone number is required'
  else if (!isValidPhone(form.phoneNumber)) e.phoneNumber = 'Enter a 10-digit phone number'
  if (!form.location.trim()) e.location = 'Where is the vehicle going?'
  if (!form.startDate) e.startDate = 'Pick a start date'
  if (!form.endDate) e.endDate = 'Pick an end date'
  else if (form.startDate && new Date(form.endDate) < new Date(form.startDate))
    e.endDate = 'End date can\u2019t be before the start date'
  if (!Number(form.days) || Number(form.days) < 1) e.days = 'Rental must be at least one day'
  if (form.totalAmount === '' || Number.isNaN(total)) e.totalAmount = 'Enter the rental amount'
  else if (total < 0) e.totalAmount = 'Amount can\u2019t be negative'
  if (paid < 0) e.amountPaid = 'Paid amount can\u2019t be negative'
  else if (paid > total) e.amountPaid = 'Paid can\u2019t be more than the total'

  return e
}

export default function AddRental() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const { vehicles, rentals, loading, addRentalOptimistic, updateRentalOptimistic } = useData()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const [form, setForm] = useState({ ...BLANK, vehicleId: params.get('vehicle') || '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [manualDays, setManualDays] = useState(false)
  const original = isEdit ? rentals.find((r) => r.id === id) : null
  const hydrated = useRef(false)

  // Dynamically keep selected vehicle in sync if query param is provided or changed
  useEffect(() => {
    const vId = params.get('vehicle')
    if (vId) {
      setForm((f) => (f.vehicleId === vId ? f : { ...f, vehicleId: vId }))
    }
  }, [params])

  useEffect(() => {
    if (!isEdit || loading || !original || hydrated.current) return
    hydrated.current = true
    setForm({
      vehicleId: original.vehicleId || '',
      driverName: original.driverName || '',
      phoneNumber: original.phoneNumber || '',
      location: original.location || '',
      startDate: inputDate(original.startDate),
      endDate: inputDate(original.endDate),
      days: String(original.days || 1),
      totalAmount: String(original.totalAmount ?? ''),
      amountPaid: String(original.amountPaid ?? ''),
      notes: original.notes || '',
      status: original.status || 'active',
    })
    setManualDays(true)
  }, [isEdit, loading, original])

  // Dates drive the day count unless the owner overrides it.
  useEffect(() => {
    if (manualDays || !form.startDate || !form.endDate) return
    const d = daysBetween(form.startDate, form.endDate)
    setForm((f) => (String(d) === f.days ? f : { ...f, days: String(d) }))
  }, [form.startDate, form.endDate, manualDays])

  const vehicle = vehicles.find((v) => v.id === form.vehicleId)
  const total = Number(form.totalAmount) || 0
  const paid = Number(form.amountPaid) || 0
  const balance = Math.max(0, total - paid)
  const perDay = Number(form.days) > 0 ? total / Number(form.days) : 0

  const suggestions = useMemo(() => {
    const seen = new Map()
    for (const r of rentals) if (r.phoneNumber && !seen.has(r.phoneNumber)) seen.set(r.phoneNumber, r)
    return [...seen.values()].slice(0, 60)
  }, [rentals])

  const set = (key) => (e) => {
    const value = e.target.value
    setForm((f) => ({ ...f, [key]: value }))
    if (errors[key]) setErrors((x) => ({ ...x, [key]: undefined }))
  }

  // Typing a known phone number fills the driver's name and usual location.
  const onPhoneChange = (e) => {
    const value = e.target.value
    setForm((f) => {
      const next = { ...f, phoneNumber: value }
      const match = suggestions.find((s) => phoneDigits(s.phoneNumber) === phoneDigits(value))
      if (match && !f.driverName.trim()) {
        next.driverName = match.driverName
        next.location = f.location || match.location || ''
      }
      return next
    })
    if (errors.phoneNumber) setErrors((x) => ({ ...x, phoneNumber: undefined }))
  }

  const submit = async (e) => {
    e.preventDefault()
    const found = validate(form)
    setErrors(found)
    if (Object.keys(found).length) {
      toast('Fix the highlighted fields', 'error')
      return
    }

    setBusy(true)
    try {
      const payload = {
        ...form,
        vehicleName: vehicle?.name || '',
        registrationNumber: vehicle?.registrationNumber || '',
      }
      if (isEdit) {
        // Immediate 0ms optimistic UI update and instant navigation
        updateRentalOptimistic(id, payload, original)
        toast('Rental updated')
        navigate('/rentals')
        // Sync to Firestore in background
        await updateRental(id, payload, original)
      } else {
        const newRef = createRentalRef()
        const newId = newRef.id
        // Add to React state & update vehicle status immediately (0ms delay)
        addRentalOptimistic({
          id: newId,
          ...payload,
          createdAt: new Date().toISOString(),
        })
        toast('Rental recorded')
        navigate('/rentals')
        // Sync to Firestore in background
        await addRentalWithId(newId, payload)
      }
    } catch (err) {
      console.warn('Background rental sync notice:', err.message)
    } finally {
      setBusy(false)
    }
  }

  if (!loading && vehicles.length === 0)
    return (
      <div className="center-pad">
        <p>Add a vehicle before recording a rental.</p>
        <button className="btn btn-primary" onClick={() => navigate('/vehicles/new')}>
          Add a vehicle
        </button>
      </div>
    )

  return (
    <>
      <div className="page-head">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 6, paddingLeft: 0 }}>
            <ArrowLeft size={15} /> Back
          </button>
          <h1>{isEdit ? 'Edit rental' : 'Record a rental'}</h1>
          <p>Days and balance are worked out for you as you type.</p>
        </div>
      </div>

      <div className="grid-main">
        <section className="panel">
          <form onSubmit={submit} className="panel-body" noValidate>
            <div className="form-grid">
              <div className="fieldset-title">
                <Car size={16} /> Vehicle
              </div>

              <div className="field span-2">
                <label htmlFor="vehicle">
                  Which vehicle <span className="req">*</span>
                </label>
                <select id="vehicle" className={`select ${errors.vehicleId ? 'invalid' : ''}`} value={form.vehicleId} onChange={set('vehicleId')}>
                  <option value="">Choose a vehicle</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} — {v.registrationNumber}
                      {v.status === 'rented' && v.id !== original?.vehicleId ? ' (currently out)' : ''}
                      {v.status === 'maintenance' ? ' (in maintenance)' : ''}
                    </option>
                  ))}
                </select>
                {errors.vehicleId && (
                  <span className="err-text">
                    <AlertCircle size={13} /> {errors.vehicleId}
                  </span>
                )}
                {vehicle && (
                  <div className="row" style={{ marginTop: 6 }}>
                    <Plate number={vehicle.registrationNumber} />
                    <StatusBadge kind="vehicle" status={vehicle.status} />
                    <span className="hint">{vehicle.model || vehicle.type}</span>
                  </div>
                )}
              </div>

              <div className="fieldset-title">
                <User size={16} /> Driver
              </div>

              <div className="field">
                <label htmlFor="phone">
                  Phone number <span className="req">*</span>
                </label>
                <input id="phone" className={`input ${errors.phoneNumber ? 'invalid' : ''}`} type="tel" inputMode="tel" list="known-phones" value={form.phoneNumber} onChange={onPhoneChange} placeholder="9876543210" />
                <datalist id="known-phones">
                  {suggestions.map((s) => (
                    <option key={s.id} value={s.phoneNumber}>
                      {s.driverName}
                    </option>
                  ))}
                </datalist>
                {errors.phoneNumber ? (
                  <span className="err-text">
                    <AlertCircle size={13} /> {errors.phoneNumber}
                  </span>
                ) : (
                  <span className="hint">A returning customer's details fill in automatically.</span>
                )}
              </div>

              <div className="field">
                <label htmlFor="driver">
                  Driver name <span className="req">*</span>
                </label>
                <input id="driver" className={`input ${errors.driverName ? 'invalid' : ''}`} value={form.driverName} onChange={set('driverName')} placeholder="Rahul" />
                {errors.driverName && (
                  <span className="err-text">
                    <AlertCircle size={13} /> {errors.driverName}
                  </span>
                )}
              </div>

              <div className="fieldset-title">
                <CalendarDays size={16} /> Rental period
              </div>

              <div className="field span-2">
                <label htmlFor="location">
                  Going to <span className="req">*</span>
                </label>
                <input id="location" className={`input ${errors.location ? 'invalid' : ''}`} value={form.location} onChange={set('location')} placeholder="Kozhikode" />
                {errors.location && (
                  <span className="err-text">
                    <AlertCircle size={13} /> {errors.location}
                  </span>
                )}
              </div>

              <div className="field">
                <label htmlFor="start">
                  Start date <span className="req">*</span>
                </label>
                <input id="start" className={`input ${errors.startDate ? 'invalid' : ''}`} type="date" value={form.startDate} onChange={set('startDate')} />
                {errors.startDate && (
                  <span className="err-text">
                    <AlertCircle size={13} /> {errors.startDate}
                  </span>
                )}
              </div>

              <div className="field">
                <label htmlFor="end">
                  End date <span className="req">*</span>
                </label>
                <input id="end" className={`input ${errors.endDate ? 'invalid' : ''}`} type="date" min={form.startDate} value={form.endDate} onChange={set('endDate')} />
                {errors.endDate && (
                  <span className="err-text">
                    <AlertCircle size={13} /> {errors.endDate}
                  </span>
                )}
              </div>

              <div className="field">
                <label htmlFor="days">Number of days</label>
                <div className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
                  <input
                    id="days"
                    className={`input ${errors.days ? 'invalid' : ''}`}
                    type="number"
                    min="1"
                    inputMode="numeric"
                    value={form.days}
                    onChange={(e) => {
                      setManualDays(true)
                      set('days')(e)
                    }}
                  />
                  {manualDays && (
                    <button
                      type="button"
                      className="icon-btn"
                      title="Recalculate from the dates"
                      onClick={() => {
                        setManualDays(false)
                        setForm((f) => ({ ...f, days: String(daysBetween(f.startDate, f.endDate)) }))
                      }}
                    >
                      <RotateCcw size={15} />
                    </button>
                  )}
                </div>
                {errors.days ? (
                  <span className="err-text">
                    <AlertCircle size={13} /> {errors.days}
                  </span>
                ) : (
                  <span className="hint">{manualDays ? 'Set by hand' : 'Counted from the dates'}</span>
                )}
              </div>

              <div className="field">
                <label htmlFor="status">Rental status</label>
                <select id="status" className="select" value={form.status} onChange={set('status')}>
                  <option value="active">Active — vehicle is out</option>
                  <option value="completed">Completed — vehicle returned</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <span className="hint">
                  {form.status === 'active'
                    ? 'The vehicle will show as on rent.'
                    : 'The vehicle goes back to available.'}
                </span>
              </div>

              <div className="fieldset-title">
                <IndianRupee size={16} /> Payment
              </div>

              <div className="field">
                <label htmlFor="total">
                  Total rental amount <span className="req">*</span>
                </label>
                <input id="total" className={`input ${errors.totalAmount ? 'invalid' : ''}`} type="number" min="0" inputMode="numeric" value={form.totalAmount} onChange={set('totalAmount')} placeholder="8000" />
                {errors.totalAmount ? (
                  <span className="err-text">
                    <AlertCircle size={13} /> {errors.totalAmount}
                  </span>
                ) : (
                  perDay > 0 && <span className="hint">{inr(perDay)} per day</span>
                )}
              </div>

              <div className="field">
                <label htmlFor="paid">Amount paid</label>
                <input id="paid" className={`input ${errors.amountPaid ? 'invalid' : ''}`} type="number" min="0" inputMode="numeric" value={form.amountPaid} onChange={set('amountPaid')} placeholder="5000" />
                {errors.amountPaid ? (
                  <span className="err-text">
                    <AlertCircle size={13} /> {errors.amountPaid}
                  </span>
                ) : (
                  <span className="hint">Leave blank if nothing has been paid yet.</span>
                )}
              </div>

              <div className="field span-2">
                <label htmlFor="rnotes">Notes</label>
                <textarea id="rnotes" className="textarea" style={{ minHeight: 70 }} value={form.notes} onChange={set('notes')} placeholder="Advance paid by UPI, balance on return" />
              </div>
            </div>

            <div className="row" style={{ marginTop: 22, justifyContent: 'flex-end' }}>
              <button type="button" className="btn" onClick={() => navigate(-1)} disabled={busy}>
                Cancel
              </button>
              <button className="btn btn-primary" disabled={busy}>
                {busy ? <Spinner /> : <Save size={15} />}
                {isEdit ? 'Save changes' : 'Record rental'}
              </button>
            </div>
          </form>
        </section>

        <section className="panel" style={{ alignSelf: 'start' }}>
          <header className="panel-head">
            <div>
              <h3>This rental</h3>
              <p className="sub">Updates as you fill the form</p>
            </div>
          </header>
          <div className="panel-body">
            <dl className="kv">
              <dt>Vehicle</dt>
              <dd>{vehicle?.name || '—'}</dd>
              <dt>Driver</dt>
              <dd>{form.driverName || '—'}</dd>
              <dt>Going to</dt>
              <dd>{form.location || '—'}</dd>
              <dt>Days</dt>
              <dd>{form.days || '—'}</dd>
              <dt>Per day</dt>
              <dd>{perDay > 0 ? inr(perDay) : '—'}</dd>
            </dl>

            <div style={{ borderTop: '1px solid var(--line)', margin: '16px 0', paddingTop: 16 }}>
              <dl className="kv">
                <dt>Total</dt>
                <dd>{inr(total)}</dd>
                <dt>Paid</dt>
                <dd style={{ color: 'var(--green)' }}>{inr(paid)}</dd>
              </dl>
              <div className="row" style={{ justifyContent: 'space-between', marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
                <strong>Balance due</strong>
                <strong className="num" style={{ fontSize: '1.3rem', color: balance > 0 ? 'var(--red)' : 'var(--green)' }}>
                  {inr(balance)}
                </strong>
              </div>
            </div>

            <p className="hint">Balance is always total minus paid — you never type it in.</p>
          </div>
        </section>
      </div>
    </>
  )
}
