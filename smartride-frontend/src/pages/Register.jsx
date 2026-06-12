import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authAPI } from '../services/api'
import toast from 'react-hot-toast'
import { Car, User, Mail, Lock, Phone, Eye, EyeOff } from 'lucide-react'
import './Auth.css'

export default function Register() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [role, setRole] = useState(params.get('role') || 'PASSENGER')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '',
    carModel: '', licensePlate: '', vehicleCapacity: ''
  })

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.phone || !form.password) {
      toast.error('Please fill all required fields')
      return
    }
    if (role === 'DRIVER' && (!form.carModel || !form.licensePlate || !form.vehicleCapacity)) {
      toast.error('Please fill all driver details')
      return
    }

    setLoading(true)
    try {
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        role,
        ...(role === 'DRIVER' && {
          carModel: form.carModel,
          licensePlate: form.licensePlate,
          vehicleCapacity: parseInt(form.vehicleCapacity)
        })
      }
      await authAPI.register(payload)
      toast.success('OTP sent to your email!')
      navigate('/verify-otp', { state: { email: form.email } })
    } catch (err) {
      console.error('Registration error:', err)
      let msg = 'Registration failed'
      
      if (err.response?.status === 409) {
        msg = 'Email already registered'
      } else if (err.response?.data) {
        msg = typeof err.response.data === 'string' ? err.response.data : err.response.data.message || 'Registration failed'
      }
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
      </div>

      <div className="auth-card fade-up">
        <div className="auth-logo">
          <Car size={24} className="logo-icon" />
          <span>SmartRide</span>
        </div>
        <h1 className="auth-title">Create account</h1>
        <p className="auth-sub">Join SmartRide and start your journey</p>

        {/* Role Toggle */}
        <div className="role-toggle">
          <button
            className={`role-btn ${role === 'PASSENGER' ? 'active' : ''}`}
            onClick={() => setRole('PASSENGER')}
            type="button"
          >
            <User size={16} />
            Passenger
          </button>
          <button
            className={`role-btn ${role === 'DRIVER' ? 'active' : ''}`}
            onClick={() => setRole('DRIVER')}
            type="button"
          >
            <Car size={16} />
            Driver
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="sr-label">Full Name</label>
            <div className="input-wrap">
              <User size={16} className="input-icon" />
              <input className="sr-input pl-icon" placeholder="Your name" value={form.name} onChange={set('name')} />
            </div>
          </div>

          <div className="form-group">
            <label className="sr-label">Email</label>
            <div className="input-wrap">
              <Mail size={16} className="input-icon" />
              <input className="sr-input pl-icon" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} />
            </div>
          </div>

          <div className="form-group">
            <label className="sr-label">Phone</label>
            <div className="input-wrap">
              <Phone size={16} className="input-icon" />
              <input className="sr-input pl-icon" placeholder="+91 98765 43210" value={form.phone} onChange={set('phone')} />
            </div>
          </div>

          <div className="form-group">
            <label className="sr-label">Password</label>
            <div className="input-wrap">
              <Lock size={16} className="input-icon" />
              <input
                className="sr-input pl-icon pr-icon"
                type={showPass ? 'text' : 'password'}
                placeholder="Min 8 characters"
                value={form.password}
                onChange={set('password')}
              />
              <button type="button" className="input-toggle" onClick={() => setShowPass(!showPass)}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {role === 'DRIVER' && (
            <div className="driver-fields fade-up">
              <div className="driver-fields-title">
                <Car size={14} />
                Vehicle Details
              </div>
              <div className="form-group">
                <label className="sr-label">Car Model</label>
                <input className="sr-input" placeholder="e.g. Honda City" value={form.carModel} onChange={set('carModel')} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="sr-label">License Plate</label>
                  <input className="sr-input" placeholder="TN 01 AB 1234" value={form.licensePlate} onChange={set('licensePlate')} />
                </div>
                <div className="form-group">
                  <label className="sr-label">Capacity</label>
                  <input className="sr-input" type="number" min="1" max="8" placeholder="4" value={form.vehicleCapacity} onChange={set('vehicleCapacity')} />
                </div>
              </div>
            </div>
          )}

          <button type="submit" className="sr-btn sr-btn-primary auth-submit" disabled={loading}>
            {loading ? <span className="spinner" /> : null}
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
