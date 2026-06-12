import { useEffect, useState } from 'react'
import { adminAPI } from '../../services/api'
import { Filter, Calendar, MapPin, Users, Info } from 'lucide-react'
import toast from 'react-hot-toast'

function statusBadge(status) {
  const map = {
    PENDING:         ['badge-pending',   '🕐 Pending'],
    DRIVER_ASSIGNED: ['badge-started',   '👤 Assigned'],
    RIDE_STARTED:    ['badge-started',   '🚀 Started'],
    RIDE_COMPLETED:  ['badge-completed', '✅ Completed'],
    CANCELLED:       ['badge-cancelled', '❌ Cancelled'],
  }
  const [cls, label] = map[status] || ['badge-pending', status]
  return <span className={`admin-badge ${cls}`}>{label}</span>
}

export default function AdminRides() {
  const [rides, setRides] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('ALL')

  useEffect(() => {
    setError(null)
    adminAPI.getAllRides()
      .then(res => setRides(res.data))
      .catch((err) => {
        console.error('Failed to load rides', err)
        setError('Failed to load rides list. Please try again.')
      })
      .finally(() => setLoading(false))
  }, [])

  const filtered = rides.filter(r =>
    statusFilter === 'ALL' ||
    (statusFilter === 'ACTIVE' && ['PENDING', 'DRIVER_ASSIGNED', 'RIDE_STARTED'].includes(r.status)) ||
    r.status === statusFilter
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
    <div className="admin-page fade-up">
      <div className="admin-table-card">
        <div className="admin-table-header">
          <h2>🚗 Rides Management</h2>
          <div className="admin-controls">
            <div className="admin-filters">
              <Filter size={16} />
              <button className={statusFilter === 'ALL' ? 'active' : ''} onClick={() => setStatusFilter('ALL')}>All Rides</button>
              <button className={statusFilter === 'ACTIVE' ? 'active' : ''} onClick={() => setStatusFilter('ACTIVE')}>Active</button>
              <button className={statusFilter === 'RIDE_COMPLETED' ? 'active' : ''} onClick={() => setStatusFilter('RIDE_COMPLETED')}>Completed</button>
              <button className={statusFilter === 'CANCELLED' ? 'active' : ''} onClick={() => setStatusFilter('CANCELLED')}>Cancelled</button>
            </div>
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
            <div className="admin-empty-icon">🚗</div>
            <p>No rides found matching your query</p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Route</th>
                  <th>Schedule</th>
                  <th>Driver</th>
                  <th>Seats</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Bookings</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id}>
                    <td style={{ color: 'var(--text3)', fontFamily: 'monospace', fontSize: 12 }}>#{r.id}</td>
                    <td>
                      <div className="route-cell">
                        <div className="route-point"><MapPin size={12} className="text-muted" /> {r.source}</div>
                        <div className="route-point"><MapPin size={12} className="text-muted" /> {r.destination}</div>
                      </div>
                    </td>
                    <td>
                      <div className="schedule-cell">
                        <div className="date"><Calendar size={12} /> {r.date}</div>
                        <div className="time">{r.time}</div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.driverName || '—'}</div>
                      {r.driverEmail && (
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{r.driverEmail}</div>
                      )}
                    </td>
                    <td>
                       <div style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>₹{r.price}</div>
                       <div style={{ fontSize: 11, color: 'var(--text3)' }}>{r.availableSeats} seats left</div>
                    </td>
                    <td>{statusBadge(r.status)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="admin-badge badge-pending" style={{ padding: '4px 12px', minWidth: '40px' }}>
                        {r.bookingsCount}
                      </span>
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
