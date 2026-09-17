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
              <AlertCircle size={16} />
              <span>
                Firestore refused the request: {error}. Check your security rules and that this
                account is the admin UID.
              </span>
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
