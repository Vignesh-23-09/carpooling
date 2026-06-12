import { useState } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Car, LayoutDashboard, Users, MapPin, BookOpen, CreditCard, BarChart2, LogOut, Menu, X, AlertCircle } from 'lucide-react'
import ThemeSwitcher from '../../components/ThemeSwitcher'

import AdminOverview from './AdminOverview'
import AdminUsers from './AdminUsers'
import AdminRides from './AdminRides'
import AdminBookings from './AdminBookings'
import AdminPayments from './AdminPayments'
import AdminReports from './AdminReports'
import AdminDisputesPage from './AdminDisputesPage'

import './AdminDashboard.css'

const NAV_ITEMS = [
  { key: 'overview',  label: 'Dashboard',  icon: '📊', lucide: LayoutDashboard, path: '/admin' },
  { key: 'users',     label: 'Users',       icon: '👥', lucide: Users,           path: '/admin/users' },
  { key: 'rides',     label: 'Rides',       icon: '🚗', lucide: MapPin,          path: '/admin/rides' },
  { key: 'bookings',  label: 'Bookings',    icon: '📋', lucide: BookOpen,        path: '/admin/bookings' },
  { key: 'payments',  label: 'Payments',    icon: '💰', lucide: CreditCard,      path: '/admin/payments' },
  { key: 'reports',   label: 'Reports',     icon: '📈', lucide: BarChart2,       path: '/admin/reports' },
  { key: 'disputes',  label: 'Disputes',    icon: '🚨', lucide: AlertCircle,     path: '/admin/disputes' },
]

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const getActive = () => {
    const path = location.pathname
    if (path === '/admin' || path === '/admin/') return 'overview'
    const match = NAV_ITEMS.find(item => item.path !== '/admin' && path.startsWith(item.path))
    return match ? match.key : 'overview'
  }

  const activeKey = getActive()

  const getPageTitle = () => {
    const item = NAV_ITEMS.find(i => i.key === activeKey)
    return item ? item.label : 'Dashboard'
  }

  return (
    <div className="admin-layout">
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="admin-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div className="admin-sidebar-logo">
          <div className="logo-icon">
            <Car size={20} />
          </div>
          <div>
            <span>SmartRide</span>
            <small>Admin Panel</small>
          </div>
        </div>

        {/* Nav */}
        <nav className="admin-nav">
          <div className="admin-nav-section">Menu</div>
          {NAV_ITEMS.map(item => (
            <button
              key={item.key}
              className={`admin-nav-item ${activeKey === item.key ? 'active' : ''}`}
              onClick={() => {
                navigate(item.path)
                setSidebarOpen(false)
              }}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="admin-sidebar-footer">
          <div className="admin-user-card">
            <div className="admin-user-avatar">
              {user?.name?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="admin-user-info">
              <div className="admin-user-name">{user?.name || 'Admin'}</div>
              <div className="admin-user-role">Administrator</div>
            </div>
          </div>
          <button className="admin-logout-btn" onClick={handleLogout}>
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="admin-main">
        {/* Topbar */}
        <div className="admin-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              className="admin-hamburger"
              onClick={() => setSidebarOpen(s => !s)}
            >
              {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <div className="admin-topbar-title">{getPageTitle()}</div>
          </div>
          <div className="admin-topbar-right">
            <ThemeSwitcher />
            <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 600 }}>
              👋 Welcome, {user?.name || 'Admin'}
            </span>
          </div>
        </div>

        {/* Page content via sub-routes */}
        <div className="admin-page-content">
          <Routes>
            <Route index element={<AdminOverview />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="rides" element={<AdminRides />} />
            <Route path="bookings" element={<AdminBookings />} />
            <Route path="payments" element={<AdminPayments />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="disputes" element={<AdminDisputesPage />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}
