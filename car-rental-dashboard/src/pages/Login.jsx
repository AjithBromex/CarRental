import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle, Sun, Moon, Check, HelpCircle, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { Spinner } from '../components/Loading'
import Brand from '../components/Brand'

export default function Login() {
  const { user, loading, login, errorMessage } = useAuth()
  const { theme, toggle } = useTheme()
  const [form, setForm] = useState({ username: '', password: '' })
  const [remember, setRemember] = useState(true)
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [modalInfo, setModalInfo] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()

  if (!loading && user) return <Navigate to={location.state?.from || '/'} replace />

  const submit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.username.trim() || !form.password) {
      setError('Please enter both username and password.')
      return
    }

    setBusy(true)
    try {
      await login(form.username.trim(), form.password, remember)
      navigate(location.state?.from || '/', { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="glass-login-viewport">
      {/* Top corner quick theme toggle */}
      <div className="glass-top-controls">
        <button
          className="glass-control-btn"
          onClick={toggle}
          type="button"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </div>

      {/* Fluid organic background glowing gradient blobs */}
      <div className="glass-bg-mesh">
        <div className="glass-blob glass-blob-1" />
        <div className="glass-blob glass-blob-2" />
        <div className="glass-blob glass-blob-3" />
        <div className="glass-blob glass-blob-4" />
      </div>

      {/* Circular striped precision watermark badges (as in the reference image) */}
      <div className="glass-striped-circle glass-stripe-1" />
      <div className="glass-striped-circle glass-stripe-2" />
      <div className="glass-striped-circle glass-stripe-3" />
      <div className="glass-striped-circle glass-stripe-4" />

      {/* Floating 3D glossy spheres matching the reference positions */}
      <div className="glass-sphere glass-sphere-1" title="Drift Orb" />
      <div className="glass-sphere glass-sphere-2" />
      <div className="glass-sphere glass-sphere-3" />
      <div className="glass-sphere glass-sphere-4" />
      <div className="glass-sphere glass-sphere-5" />
      <div className="glass-sphere glass-sphere-6" />
      <div className="glass-sphere glass-sphere-7" />

      {/* Central Glassmorphism Card */}
      <div className="glass-card-container">
        <div className="glass-card">
          <div className="glass-card-header">
            <div className="glass-brand-row">
              <Brand size="md" />
            </div>
            <h1 className="glass-title">Login</h1>
            <div className="glass-subtitle">Owner access &bull; Sign in with your Firebase admin account</div>
          </div>

          <form onSubmit={submit} noValidate>
            {/* Username / Email field */}
            <div className="glass-field">
              <div className="glass-field-label-row">
                <label className="glass-label" htmlFor="username">
                  Username or email
                </label>
              </div>
              <div className="glass-input-wrapper">
                <input
                  id="username"
                  className={`glass-input ${error && !form.username.trim() ? 'invalid' : ''}`}
                  value={form.username}
                  autoComplete="username"
                  autoCapitalize="none"
                  placeholder="admin@drift.co"
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                />
              </div>
            </div>

            {/* Password field */}
            <div className="glass-field">
              <div className="glass-field-label-row">
                <label className="glass-label" htmlFor="password">
                  Password
                </label>
                <button
                  type="button"
                  className="glass-forgot-link"
                  onClick={() =>
                    setModalInfo({
                      title: 'Reset Password',
                      message:
                        'To reset your admin password, please access the Firebase Console Authentication tab or contact your system administrator.',
                    })
                  }
                >
                  Forgot password ?
                </button>
              </div>
              <div className="glass-input-wrapper">
                <input
                  id="password"
                  className={`glass-input glass-input-pw ${error && !form.password ? 'invalid' : ''}`}
                  type={show ? 'text' : 'password'}
                  value={form.password}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <button
                  type="button"
                  className="glass-pw-toggle"
                  onClick={() => setShow((s) => !s)}
                  aria-label={show ? 'Hide password' : 'Show password'}
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember me toggle */}
            <label className="glass-row-remember" onClick={() => setRemember(!remember)}>
              <div className={`glass-checkbox-custom ${remember ? 'checked' : ''}`}>
                {remember && <Check size={12} color="#ffffff" strokeWidth={3} />}
              </div>
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                style={{ display: 'none' }}
              />
              <span className="glass-remember-label">Remember me</span>
            </label>

            {/* Error message */}
            {error && (
              <div className="glass-alert" role="alert">
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Submit button */}
            <button className="glass-submit-btn" type="submit" disabled={busy}>
              {busy ? (
                <>
                  <Spinner />
                  <span>Logging in...</span>
                </>
              ) : (
                'Login'
              )}
            </button>

            {/* Footer sign up prompt */}
            <div className="glass-footer-link">
              Don't have an account ?{' '}
              <button
                type="button"
                className="glass-signup-link"
                onClick={() =>
                  setModalInfo({
                    title: 'New Account Request',
                    message:
                      'Drift.co Rental Dashboard is an owner-administered system. To add a new manager or admin account, please request access from the principal owner or create the user in your Firebase project.',
                  })
                }
              >
                Sign up
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Informational Dialog for Forgot Password / Sign up */}
      {modalInfo && (
        <div className="backdrop" style={{ zIndex: 100 }} onClick={() => setModalInfo(null)}>
          <div
            className="modal"
            style={{
              background: 'rgba(18, 20, 28, 0.92)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="modal-head"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div className="row" style={{ gap: 10, alignItems: 'center' }}>
                <HelpCircle size={20} color="#e51b24" />
                <h3 style={{ color: '#ffffff', margin: 0 }}>{modalInfo.title}</h3>
              </div>
              <button className="icon-btn" onClick={() => setModalInfo(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '20px 24px', color: 'rgba(255, 255, 255, 0.85)' }}>
              <p style={{ margin: 0, lineHeight: 1.6 }}>{modalInfo.message}</p>
            </div>
            <div className="modal-foot" style={{ justifyContent: 'flex-end', padding: '14px 24px' }}>
              <button className="btn btn-primary" onClick={() => setModalInfo(null)}>
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
