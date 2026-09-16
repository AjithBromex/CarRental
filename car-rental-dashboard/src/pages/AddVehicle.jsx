import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Car, ImageIcon, AlertCircle, Save } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { Spinner } from '../components/Loading'
import Plate from '../components/Plate'
import { addVehicle, updateVehicle, VEHICLE_TYPES } from '../services/vehicleService'

const BLANK = {
  name: '',
  model: '',
  registrationNumber: '',
  image: '',
  type: 'SUV',
  year: String(new Date().getFullYear()),
  notes: '',
  status: 'available',
}

const validate = (form, existing, id) => {
  const e = {}
  const year = Number(form.year)
  const thisYear = new Date().getFullYear()

  if (!form.name.trim()) e.name = 'Give the vehicle a name'
  if (!form.registrationNumber.trim()) e.registrationNumber = 'Registration number is required'
  else if (
    existing.some(
      (v) =>
        v.id !== id &&
        v.registrationNumber?.toUpperCase() === form.registrationNumber.trim().toUpperCase()
    )
  )
    e.registrationNumber = 'Another vehicle already uses this plate'
  if (!form.year) e.year = 'Enter the model year'
  else if (year < 1980 || year > thisYear + 1) e.year = `Year must be between 1980 and ${thisYear + 1}`
  if (form.image && !/^https?:\/\//i.test(form.image.trim())) e.image = 'Use a full https:// image link'

  return e
}

export default function AddVehicle() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const { vehicles, loading } = useData()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [form, setForm] = useState(BLANK)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const hydrated = useRef(false)

  useEffect(() => {
    if (!isEdit || loading || hydrated.current) return
    const v = vehicles.find((x) => x.id === id)
    if (!v) return setNotFound(true)
    hydrated.current = true
    setForm({
      name: v.name || '',
      model: v.model || '',
      registrationNumber: v.registrationNumber || '',
      image: v.image || '',
      type: v.type || 'SUV',
      year: String(v.year || ''),
      notes: v.notes || '',
      status: v.status || 'available',
    })
  }, [id, isEdit, vehicles, loading])

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    if (errors[key]) setErrors((x) => ({ ...x, [key]: undefined }))
  }

  const preview = useMemo(
    () => (/^https?:\/\//i.test(form.image.trim()) ? form.image.trim() : ''),
    [form.image]
  )

  const submit = async (e) => {
    e.preventDefault()
    const found = validate(form, vehicles, id)
    setErrors(found)
    if (Object.keys(found).length) return

    setBusy(true)
    try {
      if (isEdit) {
        await updateVehicle(id, form)
        toast(`${form.name} updated`)
        navigate(`/vehicles/${id}`)
      } else {
        await addVehicle(form)
        toast(`${form.name} added to the fleet`)
        navigate('/vehicles')
      }
    } catch (err) {
      toast(`Couldn't save: ${err.message}`, 'error')
    } finally {
      setBusy(false)
    }
  }

  if (notFound)
    return (
      <div className="center-pad">
        <p>That vehicle no longer exists.</p>
        <button className="btn" onClick={() => navigate('/vehicles')}>
          Back to vehicles
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
          <h1>{isEdit ? 'Edit vehicle' : 'Add a vehicle'}</h1>
          <p>{isEdit ? 'Changes apply everywhere immediately.' : 'It appears in the fleet as soon as you save.'}</p>
        </div>
      </div>

      <div className="grid-main">
        <section className="panel">
          <form onSubmit={submit} className="panel-body" noValidate>
            <div className="form-grid">
              <div className="fieldset-title">
                <Car size={16} /> Vehicle details
              </div>

              <div className="field">
                <label htmlFor="name">
                  Vehicle name <span className="req">*</span>
                </label>
                <input id="name" className={`input ${errors.name ? 'invalid' : ''}`} value={form.name} onChange={set('name')} placeholder="Toyota Innova" />
                {errors.name && (
                  <span className="err-text">
                    <AlertCircle size={13} /> {errors.name}
                  </span>
                )}
              </div>

              <div className="field">
                <label htmlFor="model">Model</label>
                <input id="model" className="input" value={form.model} onChange={set('model')} placeholder="Innova Crysta" />
              </div>

              <div className="field">
                <label htmlFor="reg">
                  Registration number <span className="req">*</span>
                </label>
                <input
                  id="reg"
                  className={`input ${errors.registrationNumber ? 'invalid' : ''}`}
                  value={form.registrationNumber}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, registrationNumber: e.target.value.toUpperCase() }))
                    if (errors.registrationNumber) setErrors((x) => ({ ...x, registrationNumber: undefined }))
                  }}
                  placeholder="KL 10 AB 4421"
                  autoCapitalize="characters"
                />
                {errors.registrationNumber && (
                  <span className="err-text">
                    <AlertCircle size={13} /> {errors.registrationNumber}
                  </span>
                )}
              </div>

              <div className="field">
                <label htmlFor="type">Vehicle type</label>
                <select id="type" className="select" value={form.type} onChange={set('type')}>
                  {VEHICLE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="year">
                  Year <span className="req">*</span>
                </label>
                <input id="year" className={`input ${errors.year ? 'invalid' : ''}`} type="number" inputMode="numeric" value={form.year} onChange={set('year')} placeholder="2023" />
                {errors.year && (
                  <span className="err-text">
                    <AlertCircle size={13} /> {errors.year}
                  </span>
                )}
              </div>

              <div className="field">
                <label htmlFor="status">Current status</label>
                <select id="status" className="select" value={form.status} onChange={set('status')}>
                  <option value="available">Available</option>
                  <option value="rented">On rent</option>
                  <option value="maintenance">Maintenance</option>
                </select>
                <span className="hint">Recording a rental switches this automatically.</span>
              </div>

              <div className="field span-2">
                <label htmlFor="image">Photo link</label>
                <input id="image" className={`input ${errors.image ? 'invalid' : ''}`} value={form.image} onChange={set('image')} placeholder="https://…/innova.jpg" />
                {errors.image ? (
                  <span className="err-text">
                    <AlertCircle size={13} /> {errors.image}
                  </span>
                ) : (
                  <span className="hint">Paste any image URL. Upload to Firebase Storage and paste the download link if you host your own photos.</span>
                )}
              </div>

              <div className="field span-2">
                <label htmlFor="notes">Notes</label>
                <textarea id="notes" className="textarea" value={form.notes} onChange={set('notes')} placeholder="Insurance renewal in March, diesel, seats 7" />
              </div>
            </div>

            <div className="row" style={{ marginTop: 22, justifyContent: 'flex-end' }}>
              <button type="button" className="btn" onClick={() => navigate(-1)} disabled={busy}>
                Cancel
              </button>
              <button className="btn btn-primary" disabled={busy}>
                {busy ? <Spinner /> : <Save size={15} />}
                {isEdit ? 'Save changes' : 'Add vehicle'}
              </button>
            </div>
          </form>
        </section>

        <section className="panel" style={{ alignSelf: 'start' }}>
          <header className="panel-head">
            <h3>Preview</h3>
          </header>
          <div className="panel-body">
            <div className="vcard-media" style={{ borderRadius: 'var(--r-md)', marginBottom: 14 }}>
              {preview ? (
                <img src={preview} alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
              ) : (
                <span className="fallback">
                  <ImageIcon size={28} />
                </span>
              )}
            </div>
            <h3 style={{ marginBottom: 4 }}>{form.name || 'Vehicle name'}</h3>
            <p className="hint" style={{ marginBottom: 12 }}>
              {form.model || 'Model'} · {form.type} · {form.year || '—'}
            </p>
            <Plate number={form.registrationNumber || 'KL 00 AA 0000'} size="lg" />
            {form.notes && (
              <p style={{ marginTop: 16, fontSize: '0.86rem', color: 'var(--muted)' }}>{form.notes}</p>
            )}
          </div>
        </section>
      </div>
    </>
  )
}
