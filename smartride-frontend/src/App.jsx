import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import Landing from './pages/Landing'
import Register from './pages/Register'
import VerifyOtp from './pages/VerifyOtp'
import Login from './pages/Login'
import DriverDashboard from './pages/DriverDashboard'
import PassengerDashboard from './pages/PassengerDashboard'
import AdminDashboard from './pages/admin/AdminDashboard'

import { ThemeProvider } from './context/ThemeContext'

function AppRoutes() {
  const { isAuthenticated, role } = useAuth()

  const getDefaultPath = () => {
    if (role === 'DRIVER') return '/driver'
    if (role === 'ADMIN') return '/admin'
    return '/passenger'
  }

  return (
    <>
      {/* Hide navbar on admin pages */}
      {role !== 'ADMIN' && <Navbar />}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/register" element={
          isAuthenticated
            ? <Navigate to={getDefaultPath()} replace />
            : <Register />
        } />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/login" element={
          isAuthenticated
            ? <Navigate to={getDefaultPath()} replace />
            : <Login />
        } />
        <Route path="/driver" element={
          <ProtectedRoute requiredRole="DRIVER">
            <DriverDashboard />
          </ProtectedRoute>
        } />
        <Route path="/passenger" element={
          <ProtectedRoute requiredRole="PASSENGER">
            <PassengerDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/*" element={
          <ProtectedRoute requiredRole="ADMIN">
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: 'rgba(20, 20, 30, 0.9)',
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                fontSize: '14px',
                backdropFilter: 'blur(10px)'
              },
              success: { iconTheme: { primary: '#22c55e', secondary: '#1e1e2e' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#1e1e2e' } },
            }}
          />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
