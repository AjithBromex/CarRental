import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sun, Moon, Download, LogOut, ShieldCheck, Database, Copy } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import ConfirmDialog from '../components/ConfirmDialog'
import { initials, num, fmtDate } from '../utils/format'

export default function Settings() {
  const { theme, toggle } = useTheme()
  const { user, logout } = useAuth()
  const { vehicles, rentals } = useData()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [confirm, setConfirm] = useState(false)

  const name = user?.email?.split('@')[0] || 'admin'

  const backup = () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), vehicles, rentals }, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fleetline-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast('Backup downloaded')
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p>Your account, how the dashboard looks, and a copy of your data</p>
        </div>
      </div>

      <div className="grid-2">
        <section className="panel">
          <header className="panel-head">
            <h3>Account</h3>
          </header>
          <div className="panel-body">
            <div className="row" style={{ gap: 12, marginBottom: 18 }}>
              <span className="avatar" style={{ width: 44, height: 44, flex: '0 0 44px', fontSize: '1rem' }}>
                {initials(name)}
              </span>
              <div>
                <strong style={{ display: 'block' }}>{name}</strong>
                <span className="hint">{user?.email}</span>
                <div style={{ marginTop: 6, fontSize: '0.78rem', color: 'var(--muted)' }}>
                  UID: <code style={{ userSelect: 'all', background: 'var(--surface-2)', padding: '2px 6px', borderRadius: 4, color: 'var(--text)', fontFamily: 'monospace' }}>{user?.uid || 'Not loaded'}</code>
                </div>
              </div>
            </div>

            <div className="alert info">
              <ShieldCheck size={16} />
              <span>
                This is the only account with access. Change the password from Firebase console →
                Authentication → Users, or send yourself a reset email from there.
              </span>
            </div>

            <button className="btn btn-block" style={{ marginTop: 14 }} onClick={() => setConfirm(true)}>
              <LogOut size={15} /> Sign out
            </button>
          </div>
        </section>

        <section className="panel">
          <header className="panel-head">
            <h3>Appearance</h3>
          </header>
          <div className="panel-body">
            <div className="setting-row">
              <div>
                <strong>{theme === 'dark' ? 'Dark' : 'Light'} theme</strong>
                <p>Dark is easier at night in the shop; light reads better in daylight.</p>
              </div>
              <button className={`switch ${theme === 'dark' ? 'on' : ''}`} onClick={toggle} aria-label="Toggle theme" />
            </div>
            <div className="setting-row">
              <div>
                <strong>Quick switch</strong>
                <p>The sun and moon button in the top bar does the same thing from any page.</p>
              </div>
              <span className="icon-btn" aria-hidden="true">
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </span>
            </div>
          </div>
        </section>

        <section className="panel">
          <header className="panel-head">
            <h3>Your data</h3>
          </header>
          <div className="panel-body">
            <div className="setting-row">
              <div>
                <strong>{num(vehicles.length)} vehicles, {num(rentals.length)} rentals</strong>
                <p>Stored in Cloud Firestore and streamed to this dashboard as it changes.</p>
              </div>
              <Database size={18} style={{ color: 'var(--muted)' }} />
            </div>
            <div className="setting-row">
              <div>
                <strong>Download a backup</strong>
                <p>A JSON copy of every vehicle and rental, useful before a big cleanup.</p>
              </div>
              <button className="btn btn-sm" onClick={backup}>
                <Download size={14} /> Download
              </button>
            </div>
            {rentals[0] && (
              <div className="setting-row">
                <div>
                  <strong>Last rental recorded</strong>
                  <p>
                    {rentals[0].driverName} on {rentals[0].vehicleName}, {fmtDate(rentals[0].startDate)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="panel">
          <header className="panel-head">
            <h3>Security</h3>
          </header>
          <div className="panel-body">
            <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginBottom: 14 }}>
              Firestore rules only let the admin UID or authorized email read or write. Make sure to publish these in Firebase Console → Firestore Database → Rules:
            </p>
            <pre
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--r-sm)',
                padding: 12,
                fontSize: '0.78rem',
                overflowX: 'auto',
                margin: 0,
                color: 'var(--muted)',
                fontFamily: 'monospace',
              }}
            >{`allow read, write: if request.auth != null
  && (request.auth.uid == "${user?.uid || 'YUadCTU9tVhXttsE9rq1AcHvE492'}"
      || request.auth.token.email == "admin@fleetline.local");`}</pre>
            <p className="hint" style={{ marginTop: 10 }}>
              The full rule set ships in firestore.rules at the project root.
            </p>
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={confirm}
        title="Sign out?"
        body="You'll need your username and password to get back in."
        confirmLabel="Sign out"
        onCancel={() => setConfirm(false)}
        onConfirm={async () => {
          await logout()
          navigate('/login', { replace: true })
        }}
      />
    </>
  )
}
