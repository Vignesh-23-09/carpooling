import { useState, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { authAPI } from '../services/api'
import toast from 'react-hot-toast'
import { Mail, CheckCircle, Car } from 'lucide-react'
import './Auth.css'

export default function VerifyOtp() {
  const navigate = useNavigate()
  const location = useLocation()
  const email = location.state?.email || ''
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [verified, setVerified] = useState(false)
  const inputs = useRef([])

  const handleChange = (i, val) => {
    if (!/^\d?$/.test(val)) return
    const next = [...otp]
    next[i] = val
    setOtp(next)
    if (val && i < 5) inputs.current[i + 1]?.focus()
  }

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      inputs.current[i - 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setOtp(pasted.split(''))
      inputs.current[5]?.focus()
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const code = otp.join('')
    if (code.length < 6) { toast.error('Enter all 6 digits'); return }

    setLoading(true)
    try {
      await authAPI.verifyOtp({ email, otp: code })
      setVerified(true)
      toast.success('Email verified!')
      setTimeout(() => navigate('/login'), 1800)
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || 'Invalid OTP'
      toast.error(msg)
      setOtp(['', '', '', '', '', ''])
      inputs.current[0]?.focus()
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

        {verified ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div className="success-icon">
              <CheckCircle size={32} />
            </div>
            <h2 className="auth-title">Verified!</h2>
            <p className="auth-sub">Redirecting to login...</p>
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <div style={{
                width: 56, height: 56,
                background: 'rgba(108,99,255,0.12)',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--accent)',
                margin: '0 auto 16px'
              }}>
                <Mail size={26} />
              </div>
            </div>
            <h1 className="auth-title" style={{ textAlign: 'center' }}>Verify Email</h1>
            <p className="otp-email">
              We sent a 6-digit code to<br />
              <strong>{email || 'your email'}</strong>
            </p>

            <form onSubmit={handleSubmit}>
              <div className="otp-inputs" onPaste={handlePaste}>
                {otp.map((d, i) => (
                  <input
                    key={i}
                    ref={el => inputs.current[i] = el}
                    className="otp-input"
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={e => handleChange(i, e.target.value)}
                    onKeyDown={e => handleKeyDown(i, e)}
                  />
                ))}
              </div>

              <button type="submit" className="sr-btn sr-btn-primary auth-submit" disabled={loading}>
                {loading ? <span className="spinner" /> : null}
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
            </form>

            <p className="otp-resend">
              Didn't get it? Check spam or{' '}
              <button onClick={() => toast('Please register again to resend OTP')}>resend</button>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
