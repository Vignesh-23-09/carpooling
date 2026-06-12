import { useState } from 'react'
import { X, Send, AlertTriangle } from 'lucide-react'
import { disputeAPI } from '../services/api'
import toast from 'react-hot-toast'
import './DisputeModal.css'

const DISPUTE_TYPES = [
  { value: 'PAYMENT_ISSUE',        label: 'Payment Issue' },
  { value: 'DRIVER_BEHAVIOUR',     label: 'Driver Behaviour' },
  { value: 'PASSENGER_BEHAVIOUR',  label: 'Passenger Behaviour' },
  { value: 'RIDE_CANCELLED',       label: 'Ride Cancelled' },
  { value: 'REFUND_NOT_RECEIVED',  label: 'Refund Not Received' },
  { value: 'OTHER',                label: 'Other' },
]

export default function DisputeModal({ bookingId, onClose, onSuccess }) {
  const [type, setType] = useState('PAYMENT_ISSUE')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!description.trim()) {
      return toast.error('Please provide a description')
    }

    setLoading(true)
    try {
      await disputeAPI.raiseDispute({
        bookingId,
        type,
        description
      })
      toast.success('Dispute raised successfully')
      onSuccess()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to raise dispute')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="user-dispute-modal-overlay" onClick={onClose}>
      <div className="user-dispute-modal-card" onClick={e => e.stopPropagation()}>
        <div className="user-dispute-modal-header">
          <div className="user-dispute-header-icon">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3>Raise a Dispute</h3>
            <p>Tell us what went wrong. Our admin will review it.</p>
          </div>
          <button className="user-dispute-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="user-dispute-form">
          <div className="form-group">
            <label>Issue Type</label>
            <select 
              value={type} 
              onChange={e => setType(e.target.value)}
              className="user-dispute-input"
            >
              {DISPUTE_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Provide as much detail as possible..."
              className="user-dispute-input user-dispute-textarea"
              rows={4}
            />
          </div>

          <div className="user-dispute-actions">
            <button type="button" className="sr-btn sr-btn-ghost" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="sr-btn sr-btn-primary" disabled={loading}>
              {loading ? (
                <><span className="spinner" /> Submitting...</>
              ) : (
                <><Send size={16} /> Submit Dispute</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
