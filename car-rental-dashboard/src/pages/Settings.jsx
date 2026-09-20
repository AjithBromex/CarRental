import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sun, Moon, Download, LogOut, Database, ShieldCheck, CheckCircle2, Car } from 'lucide-react'
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

  const name = user?.displayName || user?.email?.split('@')[0] || 'admin'

  const backup = () => {
    const blob = new Blob(
      [JSON.stringify({ exportedAt: new Date().toISOString(), vehicles, rentals }, null, 2)],
      { type: 'application/json' }
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `drift-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast('Data backup downloaded successfully')
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p>Manage your account preferences, theme, and data backups</p>
        </div>
      </div>

      <div className="grid-2">
        {/* Account Panel */}
        <section className="panel">
          <header className="panel-head">
            <h3>Account</h3>
          </header>
          <div className="panel-body">
            <div className="row" style={{ gap: 14, marginBottom: 20 }}>
              <span
                className="avatar"
                style={{
                  width: 48,
                  height: 48,
                  flex: '0 0 48px',
                  fontSize: '1.1rem',
                  background: 'var(--amber-soft)',
                  color: 'var(--amber)',
                  border: '1px solid var(--amber)',
                }}
              >
                {initials(name)}
              </span>
              <div>
                <strong style={{ display: 'block', fontSize: '1.05rem' }}>{name}</strong>
                <span className="hint" style={{ fontSize: '0.86rem' }}>
                  {user?.email || 'admin@drift.co'}
                </span>
                <div style={{ marginTop: 6 }}>
                  <span className="badge amber" style={{ fontSize: '0.72rem' }}>
                    Principal Owner
                  </span>
                </div>
              </div>
            </div>

            <button
              className="btn btn-block"
              style={{ marginTop: 8 }}
              onClick={() => setConfirm(true)}
            >
              <LogOut size={15} /> Sign out
            </button>
          </div>
        </section>

        {/* Appearance Panel */}
        <section className="panel">
          <header className="panel-head">
            <h3>Appearance</h3>
          </header>
          <div className="panel-body">
            <div className="setting-row">
              <div>
                <strong>{theme === 'dark' ? 'Dark' : 'Light'} theme</strong>
                <p>
                  {theme === 'dark'
                    ? 'Dark carbon high-contrast theme optimized for night and low-light environments.'
                    : 'Clean light mode optimized for daytime reading.'}
                </p>
              </div>
              <button
                className={`switch ${theme === 'dark' ? 'on' : ''}`}
                onClick={toggle}
                aria-label="Toggle theme"
              />
            </div>
          </div>
        </section>

        {/* Your Data Panel */}
        <section className="panel">
          <header className="panel-head">
            <h3>Fleet Data &amp; Backup</h3>
          </header>
          <div className="panel-body">
            <div className="setting-row">
              <div>
                <strong>
                  {num(vehicles.length)} vehicles, {num(rentals.length)} rentals
                </strong>
                <p>Active fleet records synchronized in real time.</p>
              </div>
              <Database size={18} style={{ color: 'var(--amber)' }} />
            </div>

            <div className="setting-row">
              <div>
                <strong>Download data backup</strong>
                <p>Export a full JSON copy of all vehicles and rental records.</p>
              </div>
              <button className="btn btn-sm" onClick={backup}>
                <Download size={14} /> Download
              </button>
            </div>

            {rentals[0] && (
              <div className="setting-row">
                <div>
                  <strong>Last recorded rental</strong>
                  <p>
                    {rentals[0].driverName} &bull; {rentals[0].vehicleName} (
                    {fmtDate(rentals[0].startDate)})
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* System Overview Panel */}
        <section className="panel">
          <header className="panel-head">
            <h3>System Status</h3>
          </header>
          <div className="panel-body">
            <div className="setting-row">
              <div>
                <strong>Service Status</strong>
                <p>All core systems operational and synchronized.</p>
              </div>
              <span className="badge green" style={{ fontSize: '0.75rem' }}>
                <CheckCircle2 size={12} style={{ marginRight: 4 }} /> Operational
              </span>
            </div>

            <div className="setting-row">
              <div>
                <strong>Fleetline Core</strong>
                <p>Automotive rental management platform v1.2</p>
              </div>
              <span className="hint" style={{ fontSize: '0.82rem' }}>
                v1.2.0
              </span>
            </div>

            <div className="setting-row">
              <div>
                <strong>Security Protection</strong>
                <p>Owner-only access with encrypted session persistence.</p>
              </div>
              <ShieldCheck size={18} style={{ color: 'var(--green)' }} />
            </div>
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={confirm}
        title="Sign out?"
        body="You will need your username and password to log back into Drift.co dashboard."
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
