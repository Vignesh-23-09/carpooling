import { useEffect, useState } from 'react'
import { adminAPI } from '../../services/api'
import { Filter, CreditCard, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

function statusBadge(status) {
  const s = (status || '').toUpperCase()
  const cls = (s === 'SUCCESS' || s === 'COMPLETED') ? 'badge-completed' : s === 'FAILED' ? 'badge-cancelled' : s === 'REFUNDED' ? 'badge-started' : 'badge-pending'
  return <span className={`admin-badge ${cls}`}>{status || '—'}</span>
}

export default function AdminPayments() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('ALL')

  useEffect(() => {
    setError(null)
    adminAPI.getAllPayments()
      .then(res => setPayments(res.data))
      .catch((err) => {
        console.error('Failed to load payments', err)
        setError('Failed to load payment transactions. Please try again.')
      })
      .finally(() => setLoading(false))
  }, [])

  const filtered = payments.filter(p => {
    if (statusFilter === 'ALL') return true
    const s = (p.status || '').toUpperCase()
    if (statusFilter === 'COMPLETED' || statusFilter === 'SUCCESS') return s === 'COMPLETED' || s === 'SUCCESS'
    return s === statusFilter
  })

  const totalEarnings = payments
    .filter(p => ['SUCCESS', 'COMPLETED'].includes((p.status || '').toUpperCase()))
    .reduce((sum, p) => sum + (p.amount || 0), 0)

  const totalTx = payments.length
  const successTx = payments.filter(p => ['SUCCESS', 'COMPLETED'].includes((p.status || '').toUpperCase())).length
  const refundedAmount = payments.filter(p => (p.status || '').toUpperCase() === 'REFUNDED').reduce((s, p) => s + (p.amount || 0), 0)

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
    <div className="admin-page fade-up">
      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}
      
      {/* Summary bar */}
      <div className="admin-stats-grid">
          <div className="admin-stat-card">
              <div className="stat-icon green"><CheckCircle size={20} /></div>
              <div className="admin-stat-value stat-earnings">₹{totalEarnings.toLocaleString('en-IN')}</div>
              <div className="admin-stat-label">Total Earnings</div>
          </div>
          <div className="admin-stat-card">
              <div className="stat-icon blue"><CreditCard size={20} /></div>
              <div className="admin-stat-value stat-number">{totalTx}</div>
              <div className="admin-stat-label">Total Transactions</div>
          </div>
          <div className="admin-stat-card">
              <div className="stat-icon green"><CheckCircle size={18} /></div>
              <div className="admin-stat-value stat-number">{successTx}</div>
              <div className="admin-stat-label">Completed</div>
          </div>
          <div className="admin-stat-card">
              <div className="stat-icon yellow"><RefreshCw size={18} /></div>
              <div className="admin-stat-value stat-earnings">₹{refundedAmount.toLocaleString('en-IN')}</div>
              <div className="admin-stat-label">Refunded</div>
          </div>
      </div>

      <div className="admin-table-card">
        <div className="admin-table-header">
          <h2>💰 Payment Transactions</h2>
          <div className="admin-controls">
            <div className="admin-filters">
              <Filter size={16} />
              <button className={statusFilter === 'ALL' ? 'active' : ''} onClick={() => setStatusFilter('ALL')}>All</button>
              <button className={statusFilter === 'SUCCESS' || statusFilter === 'COMPLETED' ? 'active' : ''} onClick={() => setStatusFilter('COMPLETED')}>Completed</button>
              <button className={statusFilter === 'REFUNDED' ? 'active' : ''} onClick={() => setStatusFilter('REFUNDED')}>Refunded</button>
              <button className={statusFilter === 'FAILED' ? 'active' : ''} onClick={() => setStatusFilter('FAILED')}>Failed</button>
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="admin-empty-icon">💳</div>
            <p>No transactions found matching your criteria</p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>User</th>
                  <th>Driver</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Razorpay ID</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id}>
                    <td style={{ color: 'var(--text3)', fontFamily: 'monospace', fontSize: 12 }}>#{p.id}</td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{p.userName || '—'}</div>
                      {p.userEmail && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{p.userEmail}</div>}
                    </td>
                    <td style={{ fontWeight: 600 }}>{p.driverName || '—'}</td>
                    <td style={{ fontWeight: 800, color: 'var(--green)', fontSize: 14 }}>
                      ₹{(p.amount || 0).toFixed(2)}
                    </td>
                    <td>{statusBadge(p.status)}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text3)' }}>
                      {p.razorpayPaymentId
                        ? p.razorpayPaymentId.substring(0, 20) + '...'
                        : '—'}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text2)' }}>
                      {p.createdAt
                        ? new Date(p.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric'
                          })
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
