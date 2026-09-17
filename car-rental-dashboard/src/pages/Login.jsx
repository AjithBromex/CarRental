import { useState, useEffect } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle, Sun, Moon } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { Spinner } from '../components/Loading'
import { isConfigured } from '../firebase/firebaseConfig'

export default function Login() {
  const { user, loading, login, errorMessage } = useAuth()
  const { theme, toggle } = useTheme()
  const [form, setForm] = useState({ username: '', password: '' })
  const [remember, setRemember] = useState(true)
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const location = useLocation()

  if (!loading && user) return <Navigate to={location.state?.from || '/'} replace />

  const submit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.username.trim()) return setError('Enter your username or email.')
    if (!form.password) return setError('Enter your password.')

    if (!isConfigured)
      return setError('Firebase isn’t configured yet. Copy .env.example to .env and add your project keys.')

    setBusy(true)
    try {
      await login(form.username, form.password, remember)
      navigate(location.state?.from || '/', { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login">
      <section className="login-art">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div className="row" style={{ gap: 10 }}>
            <span className="mark">F</span>
            <span className="wordmark">
              Fleetline
              <small>Rental manager</small>
            </span>
          </div>
        </div>

        <div className="login-pitch">
          <span className="plate lg" style={{ marginBottom: 20 }}>KL 10 AB 4421</span>
          <h1>Every vehicle, every rupee, on one screen.</h1>
          <p>
            Track which cars are out, how many days they've worked, what they've earned and who
            still owes you — updated the moment you record a rental.
          </p>
        </div>

        <div className="login-stats">
          <div>
            <small>Per-vehicle</small>
            <strong>Revenue &amp; day counts</strong>
          </div>
          <div>
            <small>Per-driver</small>
            <strong>Full rental history</strong>
          </div>
          <div>
            <small>Live</small>
            <strong>Balance tracking</strong>
          </div>
        </div>
      </section>

      <section className="login-form-wrap">
        <div className="login-card">
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 26 }}>
            <div className="row mobile-only" style={{ gap: 10 }}>
              <span className="mark">F</span>
              <span className="wordmark">Fleetline</span>
            </div>
            <div style={{ flex: 1 }} />
            <button className="icon-btn" onClick={toggle} aria-label="Switch theme">
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>

          <h2>Sign in</h2>
          <p>Owner access only. Sign in with your Firebase admin account.</p>

          <form onSubmit={submit} className="stack" style={{ gap: 14 }} noValidate>
            <div className="field">
              <label htmlFor="username">Username or Email</label>
              <input
                id="username"
                className={`input ${error && !form.username ? 'invalid' : ''}`}
                value={form.username}
                autoComplete="username"
                autoCapitalize="none"
                placeholder="admin@fleetline.local"
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <div className="pw-wrap">
                <input
                  id="password"
                  className={`input ${error && !form.password ? 'invalid' : ''}`}
                  type={show ? 'text' : 'password'}
                  value={form.password}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <button
                  type="button"
                  className="pw-toggle"
                  onClick={() => setShow((s) => !s)}
                  aria-label={show ? 'Hide password' : 'Show password'}
                >
                  {show ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <label className="row" style={{ gap: 8, fontSize: '0.86rem', color: 'var(--muted)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: 'var(--amber)' }}
              />
              Keep me signed in on this device
            </label>

            {error && (
              <div className="alert error" role="alert">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
              {busy ? (
                <>
                  <Spinner /> Signing in
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>
      </section>
    </div>
  )
}
