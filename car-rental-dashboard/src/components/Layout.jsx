import { Suspense, useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import { PageLoader } from './Loading'
import ConfirmDialog from './ConfirmDialog'
import ErrorBoundary from './ErrorBoundary'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { AlertCircle } from 'lucide-react'

export default function Layout() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('fleetline:rail') === '1')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const { user, logout } = useAuth()
  const { error } = useData()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => setMobileOpen(false), [location.pathname])
  useEffect(() => localStorage.setItem('fleetline:rail', collapsed ? '1' : '0'), [collapsed])

  return (
    <div className="shell">
      {/* Ambient glowing fluid mesh for glassmorphism refraction across entire dashboard */}
      <div className="dashboard-ambient-mesh" aria-hidden="true">
        <div className="dashboard-blob blob-1" />
        <div className="dashboard-blob blob-2" />
        <div className="dashboard-blob blob-3" />
        <div className="dashboard-blob blob-4" />
        <div className="dashboard-stripe stripe-1" />
        <div className="dashboard-stripe stripe-2" />
      </div>

      <Sidebar
        collapsed={collapsed}
        open={mobileOpen}
        user={user}
        onNavigate={() => setMobileOpen(false)}
        onLogout={() => setConfirmLogout(true)}
      />
      {mobileOpen && <div className="scrim" onClick={() => setMobileOpen(false)} />}

      <div className="main">
        <Navbar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((c) => !c)}
          onOpenMobile={() => setMobileOpen(true)}
        />
        <main className="page">
          {error && (
            <div className="alert error" style={{ marginBottom: 16 }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span>
                  <strong>Firestore permission denied:</strong> {error}
                </span>
                <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                  Current user UID: <code>{user?.uid || 'Not signed in'}</code>. Please ensure rules are published in Firebase Console &gt; Firestore Database &gt; Rules. If your UID is <code>admin-local</code>, please sign out and sign in with your Firebase account.
                </span>
              </div>
            </div>
          )}
          <ErrorBoundary>
            <Suspense fallback={<PageLoader label="Loading page" />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>

      <ConfirmDialog
        open={confirmLogout}
        title="Sign out?"
        body="You'll need your username and password to get back into the dashboard."
        confirmLabel="Sign out"
        onCancel={() => setConfirmLogout(false)}
        onConfirm={async () => {
          await logout()
          navigate('/login', { replace: true })
        }}
      />
    </div>
  )
}
