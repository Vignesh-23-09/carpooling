import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { decodeToken } from '../services/jwt'
import toast from 'react-hot-toast'
import { Car, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import Lottie from 'lottie-react'
import sandyAnimation from '../assets/sandy_loading.json'
import './Auth.css'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showSandy, setShowSandy] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.email || !form.password) { toast.error('Fill all fields'); return }

    setLoading(true)
    try {
      const res = await authAPI.login(form)
      const token = res.data.token
      const decoded = decodeToken(token)
      const role = decoded?.role || ''
      const userData = { email: decoded?.sub, name: decoded?.sub?.split('@')[0] }

      // Success! Show Sandy animation for 2 seconds before redirecting
      setLoading(false)
      setShowSandy(true)

      setTimeout(() => {
        login(token, role, userData)
        toast.success('Welcome back!')
        if (role === 'DRIVER') navigate('/driver')
        else if (role === 'ADMIN') navigate('/admin')
        else navigate('/passenger')
      }, 2000)

    } catch (err) {
      setLoading(false)
      console.error('Login error:', err)
      const status = err.response?.status
      if (status === 404) toast.error('Account not found')
      else if (status === 401) toast.error('Invalid password')
      else if (status === 403) toast.error('Please verify your email first')
      else toast.error(err.response?.data || 'Login failed')
    }
  }

  return (
    <div className="auth-page">
      {showSandy && (
        <div className="sandy-overlay">
          <div className="sandy-container">
            <Lottie animationData={sandyAnimation} loop={true} />
          </div>
        </div>
      )}
      <div className="auth-bg" />

      <div className="auth-card fade-up">
        <div className="auth-logo">
          <Car size={24} className="logo-icon" />
          <span>SmartRide</span>
        </div>
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-sub">Sign in to your SmartRide account</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="sr-label">Email</label>
            <div className="input-wrap">
              <Mail size={16} className="input-icon" />
              <input className="sr-input pl-icon" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} />
            </div>
          </div>

          <div className="form-group">
            <label className="sr-label">Password</label>
            <div className="input-wrap">
              <Lock size={16} className="input-icon" />
              <input
                className="sr-input pl-icon pr-icon"
                type={showPass ? 'text' : 'password'}
                placeholder="Your password"
                value={form.password}
                onChange={set('password')}
              />
              <button type="button" className="input-toggle" onClick={() => setShowPass(!showPass)}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="sr-btn sr-btn-primary auth-submit" disabled={loading}>
            {loading ? <span className="spinner" /> : null}
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account? <Link to="/register">Create one</Link>
        </p>
      </div>
    </div>
  )
}
