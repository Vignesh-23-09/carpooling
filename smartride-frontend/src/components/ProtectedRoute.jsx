import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, requiredRole }) {
  const { isAuthenticated, role } = useAuth()

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (requiredRole && role !== requiredRole) {
    // Redirect to correct dashboard based on role
    if (role === 'DRIVER') return <Navigate to="/driver" replace />
    if (role === 'ADMIN') return <Navigate to="/admin" replace />
    return <Navigate to="/passenger" replace />
  }

  return children
}
