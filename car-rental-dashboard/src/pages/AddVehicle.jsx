import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Car, ImageIcon, AlertCircle, Save, Upload, Trash2 } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { Spinner } from '../components/Loading'
import Plate from '../components/Plate'
import { addVehicle, addVehicleWithId, createVehicleRef, updateVehicle } from '../services/vehicleService'

const BLANK = {
  name: '',
  registrationNumber: '',
  image: '',
  year: String(new Date().getFullYear()),
  notes: '',
  status: 'available',
}

const processJpgFile = (file) =>
  new Promise((resolve, reject) => {
    if (!file) return reject(new Error('No file chosen'))
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Please choose a JPG or PNG image file'))
    }

    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read image file'))
    reader.onload = (e) => {
      const img = new Image()
      img.onerror = () => reject(new Error('Unable to parse image data'))
      img.onload = () => {
        // Fast, compact dimensions for instant upload and lightweight document size
        const MAX_WIDTH = 800
        const MAX_HEIGHT = 600
        let width = img.width
        let height = img.height

        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d', { alpha: false })
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, width, height)
        ctx.drawImage(img, 0, 0, width, height)

        const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
        resolve(dataUrl)
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })

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
  if (form.image && !/^(https?:\/\/|data:image\/)/i.test(form.image.trim()))
    e.image = 'Please upload a valid JPG image file or image link'

  return e
}

export default function AddVehicle() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const { vehicles, loading, addVehicleOptimistic, updateVehicleOptimistic } = useData()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [form, setForm] = useState(BLANK)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [imageLoading, setImageLoading] = useState(false)
  const hydrated = useRef(false)

  useEffect(() => {
    if (!isEdit || loading || hydrated.current) return
    const v = vehicles.find((x) => x.id === id)
    if (!v) return setNotFound(true)
    hydrated.current = true
    setForm({
      name: v.name || '',
      registrationNumber: v.registrationNumber || '',
      image: v.image || '',
      year: String(v.year || ''),
      notes: v.notes || '',
      status: v.status || 'available',
    })
  }, [id, isEdit, vehicles, loading])

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    if (errors[key]) setErrors((x) => ({ ...x, [key]: undefined }))
  }

  const handleFile = async (file) => {
    if (!file) return
    setImageLoading(true)
    try {
      const dataUrl = await processJpgFile(file)
      setForm((f) => ({ ...f, image: dataUrl }))
      if (errors.image) setErrors((x) => ({ ...x, image: undefined }))
      toast('Vehicle photo uploaded')
    } catch (err) {
      setErrors((x) => ({ ...x, image: err.message }))
      toast(err.message, 'error')
    } finally {
      setImageLoading(false)
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const preview = useMemo(
    () => (/^(https?:\/\/|data:image\/)/i.test((form.image || '').trim()) ? form.image.trim() : ''),
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
        // Immediate 0ms optimistic UI update and instant navigation
        updateVehicleOptimistic(id, form)
        toast(`${form.name} updated`)
        navigate(`/vehicles/${id}`)
        // Sync to Firestore in background
        await updateVehicle(id, form)
      } else {
        // Generate document ID instantly
        const newRef = createVehicleRef()
        const newId = newRef.id
        // Add to React state immediately (0ms delay)
        addVehicleOptimistic({
          id: newId,
          ...form,
          year: Number(form.year),
          createdAt: new Date(),
        })
        toast(`${form.name} added to the fleet`)
        navigate('/vehicles')
        // Sync to Firestore in background
        await addVehicleWithId(newId, form)
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
                <label>Vehicle photo (.jpg, .jpeg, .png)</label>
                {preview ? (
                  <div className="image-upload-preview">
                    <img src={preview} alt="Vehicle preview" className="image-upload-thumb" />
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--fg)' }}>Photo uploaded</div>
                      <div className="hint" style={{ fontSize: '0.78rem' }}>
                        {form.image.startsWith('data:') ? 'Optimized JPG image ready' : 'Image URL linked'}
                      </div>
                    </div>
                    <label className="btn btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Upload size={14} /> Change photo
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                      />
                    </label>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => setForm((f) => ({ ...f, image: '' }))}
                      title="Remove photo"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <Trash2 size={14} /> Remove
                    </button>
                  </div>
                ) : (
                  <div
                    className={`image-upload-box ${isDragging ? 'drag-over' : ''} ${errors.image ? 'invalid' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <input
                      id="image-file"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleFileChange}
                    />
                    <div className="upload-icon-circle">
                      {imageLoading ? <Spinner /> : <Upload size={22} color="var(--amber)" />}
                    </div>
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--fg)' }}>Click to upload JPG photo</span>
                      <span style={{ color: 'var(--muted)' }}> or drag and drop</span>
                    </div>
                    <span className="hint">Supports JPG, JPEG, PNG (compressed & saved automatically)</span>
                  </div>
                )}
                {errors.image && (
                  <span className="err-text">
                    <AlertCircle size={13} /> {errors.image}
                  </span>
                )}
                <div className="row" style={{ justifyContent: 'flex-end', marginTop: 4 }}>
                  <button
                    type="button"
                    style={{
                      fontSize: '0.78rem',
                      color: 'var(--muted)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      padding: 0,
                    }}
                    onClick={() => setShowUrlInput((s) => !s)}
                  >
                    {showUrlInput ? 'Hide manual link input' : 'Or paste image link manually'}
                  </button>
                </div>
                {showUrlInput && (
                  <input
                    type="text"
                    className="input"
                    value={form.image.startsWith('data:') ? '' : form.image}
                    onChange={set('image')}
                    placeholder="https://…/innova.jpg"
                    style={{ marginTop: 6 }}
                  />
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
              {form.year || '—'}
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
