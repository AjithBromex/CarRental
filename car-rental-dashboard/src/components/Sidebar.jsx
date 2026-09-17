import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Car,
  ClipboardList,
  Wallet,
  Users,
  TrendingUp,
  Settings as SettingsIcon,
  LogOut,
} from 'lucide-react'
import { initials } from '../utils/format'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/vehicles', label: 'Vehicles', icon: Car },
  { to: '/rentals', label: 'Rentals', icon: ClipboardList },
  { to: '/payments', label: 'Payments', icon: Wallet },
  { to: '/drivers', label: 'Drivers', icon: Users },
  { to: '/analytics', label: 'Analytics', icon: TrendingUp },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
]

export default function Sidebar({ collapsed, open, onNavigate, user, onLogout }) {
  const name = user?.email?.split('@')[0] || 'admin'

  return (
    <aside className={`rail ${collapsed ? 'collapsed' : ''} ${open ? 'open' : ''}`}>
      <div className="rail-head" style={{ overflow: 'hidden' }}>
        {collapsed ? (
          <span className="mark" title="Drift.co" style={{ fontWeight: 800, fontSize: '1.1rem' }}>D</span>
        ) : (
          <div className="row" style={{ gap: 10, alignItems: 'center', width: '100%' }}>
            <img
              src="/drift-logo.jpg"
              alt="Drift.co"
              style={{
                height: 38,
                maxWidth: '100%',
                objectFit: 'contain',
                filter: 'drop-shadow(0 2px 8px rgba(229, 27, 36, 0.35))',
              }}
            />
          </div>
        )}
      </div>

      <nav className="rail-nav">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={onNavigate}
            title={label}
          >
            <Icon size={18} />
            <span className="nav-label">{label}</span>
          </NavLink>
        ))}

        <div style={{ marginTop: 'auto' }} />
        <button className="nav-item" onClick={onLogout} title="Sign out" style={{ background: 'none', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
          <LogOut size={18} />
          <span className="nav-label">Sign out</span>
        </button>
      </nav>

      <div className="rail-foot">
        <div className="rail-user">
          <span className="avatar">{initials(name)}</span>
          <div className="rail-foot-text">
            <strong>{name}</strong>
            <span>Owner account</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
