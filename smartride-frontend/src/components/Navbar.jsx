import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LogOut, Car, User } from 'lucide-react'
import NotificationDropdown from './NotificationDropdown'
import ThemeSwitcher from './ThemeSwitcher'
import './Navbar.css'

export default function Navbar() {
  const { isAuthenticated, role, user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo">
        <Car size={22} className="logo-icon" />
        <span>SmartRide</span>
      </Link>

      <div className="navbar-right">
        {isAuthenticated ? (
          <>
            <Link
              to={role === 'DRIVER' ? '/driver' : '/passenger'}
              className="navbar-link"
            >
              {role === 'DRIVER' ? 'Driver Dashboard' : 'Passenger Dashboard'}
            </Link>
            <div className="navbar-middle">
              <ThemeSwitcher />
              <NotificationDropdown />
              <div className="navbar-user">
                <User size={14} />
                <span>{user?.name || 'User'}</span>
                <span className="role-chip">{role}</span>
              </div>
            </div>
            <button className="sr-btn sr-btn-ghost navbar-logout" onClick={handleLogout}>
              <LogOut size={15} />
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="navbar-link">Login</Link>
            <Link to="/register" className="sr-btn sr-btn-primary">Get Started</Link>
          </>
        )}
      </div>
    </nav>
  )
}
