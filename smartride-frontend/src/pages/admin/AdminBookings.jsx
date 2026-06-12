import { useEffect, useState } from 'react'
import { adminAPI } from '../../services/api'
import toast from 'react-hot-toast'

function statusBadge(status) {
  const map = {
    CONFIRMED:       ['badge-active',    '✅ Confirmed'],
    PAID:            ['badge-paid',      '💳 Paid'],
    PENDING_PAYMENT: ['badge-pending',   '⏳ Pending Payment'],
    PAYMENT_FAILED:  ['badge-cancelled', '❌ Payment Failed'],
    CANCELLED:       ['badge-cancelled', '❌ Cancelled'],
    COMPLETED:       ['badge-completed', '🏁 Completed'],
    REFUNDED:        ['badge-started',   '⏪ Refunded'],
  }
  const [cls, label] = map[status] || ['badge-pending', status]
  return <span className={`admin-badge ${cls}`}>{label}</span>
}

function paymentBadge(status) {
  if (!status) return <span style={{ color: 'var(--text3)', fontSize: 12 }}>—</span>
  const s = status.toUpperCase()
  let cls = 'badge-pending'
  if (['COMPLETED', 'PAID', 'SUCCESS'].includes(s)) cls = 'badge-completed'
  else if (s === 'FAILED') cls = 'badge-cancelled'
  else if (s === 'REFUNDED') cls = 'badge-started'
  
  return <span className={`admin-badge ${cls}`}>{s}</span>
}

export default function AdminBookings() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('ALL')

  useEffect(() => {
    setError(null)
    adminAPI.getAllBookings()
      .then(res => setBookings(res.data))
      .catch((err) => {
        console.error('Failed to load bookings', err)
        setError('Failed to load bookings data. Please try again.')
      })
      .finally(() => setLoading(false))
  }, [])

  const filtered = bookings.filter(b =>
    statusFilter === 'ALL' || b.status === statusFilter
  )

  if (loading) {
    return (
      <div className="skeleton-container">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="skeleton-row" />
        ))}
      </div>
    )
  }

  return (
    <div className="admin-table-card">
      <div className="admin-table-header">
        <h2>📋 Bookings Management</h2>
        <div className="admin-table-controls">
          <select
            className="admin-filter-select"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Status</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PAID">Paid</option>
            <option value="PENDING_PAYMENT">Pending Payment</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="COMPLETED">Completed</option>
            <option value="PAYMENT_FAILED">Payment Failed</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="error-banner" style={{ margin: '0 24px 20px' }}>
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="admin-empty-icon">📋</div>
          <p>No bookings found matching your filter</p>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Passenger</th>
                <th>Driver</th>
                <th>Route</th>
                <th>Date</th>
                <th>Seats</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Payment</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => (
                <tr key={b.id}>
                  <td style={{ color: 'var(--text3)', fontFamily: 'monospace', fontSize: 12 }}>#{b.id}</td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{b.passengerName || '—'}</div>
                    {b.passengerEmail && (
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{b.passengerEmail}</div>
                    )}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{b.driverName || '—'}</div>
                    {b.driverEmail && (
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{b.driverEmail}</div>
                    )}
                  </td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{b.source}</span>
                    <span style={{ color: 'var(--text2)', margin: '0 5px' }}>→</span>
                    <span style={{ fontWeight: 600 }}>{b.destination}</span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text2)' }}>{b.date}</td>
                  <td style={{ textAlign: 'center', fontWeight: 700 }}>{b.seatCount}</td>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--green, #22c55e)' }}>₹{b.totalFare?.toFixed(2) || '0.00'}</div>
                    {b.seatCount > 1 && (
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>₹{b.farePerSeat?.toFixed(2)} × {b.seatCount}</div>
                    )}
                  </td>
                  <td>{statusBadge(b.status)}</td>
                  <td>
                    {paymentBadge(b.paymentStatus)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
