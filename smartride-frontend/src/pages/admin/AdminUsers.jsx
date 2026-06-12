import { useEffect, useState } from 'react'
import { adminAPI } from '../../services/api'
import { Search, Filter } from 'lucide-react'
import toast from 'react-hot-toast'

function getRoleBadge(role) {
  if (!role) return null
  const cls = {
    DRIVER: 'badge-driver',
    PASSENGER: 'badge-passenger',
    ADMIN: 'badge-admin',
  }[role] || 'badge-pending'
  return <span className={`admin-badge ${cls}`}>{role}</span>
}

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [actionLoading, setActionLoading] = useState({})

  const fetchUsers = async () => {
    try {
      setError(null)
      const res = await adminAPI.getAllUsers()
      setUsers(res.data)
    } catch (err) {
      console.error('Failed to load users', err)
      setError('Failed to load users list. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  const handleBlock = async (id) => {
    setActionLoading(p => ({ ...p, [id]: 'block' }))
    try {
      await adminAPI.blockUser(id)
      toast.success('User blocked')
      fetchUsers()
    } catch {
      toast.error('Failed to block user')
    } finally {
      setActionLoading(p => ({ ...p, [id]: null }))
    }
  }

  const handleUnblock = async (id) => {
    setActionLoading(p => ({ ...p, [id]: 'unblock' }))
    try {
      await adminAPI.unblockUser(id)
      toast.success('User unblocked')
      fetchUsers()
    } catch {
      toast.error('Failed to unblock user')
    } finally {
      setActionLoading(p => ({ ...p, [id]: null }))
    }
  }

  const handleVerify = async (id) => {
    setActionLoading(p => ({ ...p, [id]: 'verify' }))
    try {
      await adminAPI.verifyDriver(id)
      toast.success('Driver verified ✓')
      fetchUsers()
    } catch {
      toast.error('Failed to verify driver')
    } finally {
      setActionLoading(p => ({ ...p, [id]: null }))
    }
  }

  const filtered = users.filter(u => {
    const matchSearch = !search ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === 'ALL' || u.role === roleFilter
    return matchSearch && matchRole
  })

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
          <h2>👥 Users Management</h2>
          <div className="admin-controls">
            <div className="admin-search-wrap" style={{ maxWidth: '300px' }}>
              <Search size={18} />
              <input
                placeholder="Search by name or email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="admin-filters">
              <Filter size={16} />
              <button className={roleFilter === 'ALL' ? 'active' : ''} onClick={() => setRoleFilter('ALL')}>All</button>
              <button className={roleFilter === 'PASSENGER' ? 'active' : ''} onClick={() => setRoleFilter('PASSENGER')}>Passengers</button>
              <button className={roleFilter === 'DRIVER' ? 'active' : ''} onClick={() => setRoleFilter('DRIVER')}>Drivers</button>
              <button className={roleFilter === 'ADMIN' ? 'active' : ''} onClick={() => setRoleFilter('ADMIN')}>Admins</button>
            </div>
          </div>
        </div>

        {error && (
          <div className="error-banner" style={{ margin: '20px 24px 0' }}>
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="admin-empty-icon">🔍</div>
            <p>No users found matching your criteria</p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Driver Verified</th>
                  <th>Rating</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id}>
                    <td style={{ color: 'var(--text3)', fontFamily: 'monospace', fontSize: 12 }}>#{u.id}</td>
                    <td style={{ fontWeight: 700 }}>{u.name}</td>
                    <td style={{ color: 'var(--text2)', fontSize: 12 }}>{u.email}</td>
                    <td>{getRoleBadge(u.role)}</td>
                    <td>
                      {u.blocked
                        ? <span className="admin-badge badge-blocked">🚫 Blocked</span>
                        : <span className="admin-badge badge-active">✅ Active</span>
                      }
                    </td>
                    <td>
                      {u.role === 'DRIVER'
                        ? (u.driverVerified
                            ? <span className="admin-badge badge-verified">✓ Verified</span>
                            : <span className="admin-badge badge-unverified">Unverified</span>)
                        : <span style={{ color: 'var(--text3)', fontSize: 12 }}>—</span>
                      }
                    </td>
                    <td>
                      {u.role === 'DRIVER'
                        ? <span style={{ fontWeight: 700, color: 'var(--accent)' }}>
                            ⭐ {u.rating?.toFixed(1) || '0.0'} ({u.ratingCount || 0})
                          </span>
                        : <span style={{ color: 'var(--text3)', fontSize: 12 }}>—</span>
                      }
                    </td>
                    <td>
                      <div className="admin-action-btns">
                        {u.blocked ? (
                          <button
                            className="admin-btn admin-btn-unblock"
                            onClick={() => handleUnblock(u.id)}
                            disabled={actionLoading[u.id] === 'unblock'}
                          >
                            {actionLoading[u.id] === 'unblock' ? '...' : '✅ Unblock'}
                          </button>
                        ) : (
                          <button
                            className="admin-btn admin-btn-block"
                            onClick={() => handleBlock(u.id)}
                            disabled={actionLoading[u.id] === 'block' || u.role === 'ADMIN'}
                          >
                            {actionLoading[u.id] === 'block' ? '...' : '🚫 Block'}
                          </button>
                        )}
                        {u.role === 'DRIVER' && !u.driverVerified && (
                          <button
                            className="admin-btn admin-btn-verify"
                            onClick={() => handleVerify(u.id)}
                            disabled={actionLoading[u.id] === 'verify'}
                          >
                            {actionLoading[u.id] === 'verify' ? '...' : '✓ Verify'}
                          </button>
                        )}
                      </div>
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
