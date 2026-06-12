import { useState, useEffect, useRef } from 'react'
import { disputeAPI } from '../../services/api'
import { AlertCircle, CheckCircle, XCircle, Search, Filter, Loader, Calendar, User, BookOpen, MessageSquare, ShieldCheck, MoreVertical, Eye, Shield } from 'lucide-react'
import toast from 'react-hot-toast'
import './AdminDashboard.css'

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [selectedDispute, setSelectedDispute] = useState(null)
  const [adminNote, setAdminNote] = useState('')
  const [acting, setActing] = useState(false)
  
  // Dropdown state
  const [activeMenu, setActiveMenu] = useState(null)
  const menuRef = useRef(null)

  const fetchDisputes = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await disputeAPI.getAllDisputes()
      setDisputes(res.data)
    } catch (err) {
      console.error('Failed to load disputes', err)
      setError('Failed to load dispute records. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDisputes()
    
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenu(null)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const filtered = disputes.filter(d => {
    const matchesFilter = filter === 'ALL' || d.status === filter
    const matchesSearch = 
      d.description.toLowerCase().includes(search.toLowerCase()) ||
      d.raisedByName.toLowerCase().includes(search.toLowerCase()) ||
      d.bookingId.toString().includes(search)
    return matchesFilter && matchesSearch
  })

  const stats = {
    total: disputes.length,
    open: disputes.filter(d => d.status === 'OPEN').length,
    review: disputes.filter(d => d.status === 'UNDER_REVIEW').length,
    resolved: disputes.filter(d => d.status === 'RESOLVED').length
  }

  const handleAction = async (id, action) => {
    setActing(true)
    try {
      if (action === 'REVIEW') {
        await disputeAPI.markUnderReview(id)
        toast.success('Marked as Under Review')
      } else if (action === 'RESOLVE') {
        if (!adminNote.trim()) return toast.error('Please provide an admin note')
        await disputeAPI.resolveDispute(id, adminNote)
        toast.success('Dispute resolved')
      } else if (action === 'REJECT') {
        if (!adminNote.trim()) return toast.error('Please provide an admin note')
        await disputeAPI.rejectDispute(id, adminNote)
        toast.warning('Dispute rejected')
      }
      setSelectedDispute(null)
      setAdminNote('')
      fetchDisputes()
    } catch (err) {
      toast.error('Action failed')
    } finally {
      setActing(false)
    }
  }

  const getStatusBadge = (status) => {
    const styles = {
      OPEN:         { bg: 'rgba(239, 68, 68, 0.1)',   color: '#ef4444', icon: <AlertCircle size={12} /> },
      UNDER_REVIEW: { bg: 'rgba(245, 158, 11, 0.1)',  color: '#f59e0b', icon: <Loader size={12} className="spin" /> },
      RESOLVED:     { bg: 'rgba(34, 197, 94, 0.1)',   color: '#22c55e', icon: <CheckCircle size={12} /> },
      REJECTED:     { bg: 'rgba(156, 163, 175, 0.1)', color: '#6b7280', icon: <XCircle size={12} /> },
    }
    const s = styles[status] || styles.REJECTED
    return (
      <span className={`dispute-status-pill status-${status.toLowerCase()}`} style={{ backgroundColor: s.bg, color: s.color }}>
        {s.icon} {status.replace('_', ' ')}
      </span>
    )
  }

  return (
    <div className="admin-page fade-up">
      {/* Stats row */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="stat-icon red"><AlertCircle size={20} /></div>
          <div className="admin-stat-value stat-number">{stats.open}</div>
          <div className="admin-stat-label">Open Disputes</div>
        </div>
        <div className="admin-stat-card">
          <div className="stat-icon yellow"><Loader size={20} className="spin" /></div>
          <div className="admin-stat-value stat-number">{stats.review}</div>
          <div className="admin-stat-label">Under Review</div>
        </div>
        <div className="admin-stat-card">
          <div className="stat-icon green"><CheckCircle size={20} /></div>
          <div className="admin-stat-value stat-number">{stats.resolved}</div>
          <div className="admin-stat-label">Resolved</div>
        </div>
        <div className="admin-stat-card">
          <div className="stat-icon blue"><BookOpen size={20} /></div>
          <div className="admin-stat-value stat-number">{stats.total}</div>
          <div className="admin-stat-label">Total Filed</div>
        </div>
      </div>

      <div className="admin-controls">
        <div className="admin-search-wrap">
          <Search size={18} />
          <input 
            placeholder="Search by ID, user or description..." 
            value={search} 
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="admin-filters">
          <Filter size={16} />
          <button className={filter === 'ALL' ? 'active' : ''} onClick={() => setFilter('ALL')}>All</button>
          <button className={filter === 'OPEN' ? 'active' : ''} onClick={() => setFilter('OPEN')}>Open</button>
          <button className={filter === 'UNDER_REVIEW' ? 'active' : ''} onClick={() => setFilter('UNDER_REVIEW')}>Reviewing</button>
          <button className={filter === 'RESOLVED' ? 'active' : ''} onClick={() => setFilter('RESOLVED')}>Resolved</button>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {loading ? (
        <div className="skeleton-container">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton-row" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="admin-empty-icon">🚨</div>
          <p>No disputes found matching your criteria</p>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Booking</th>
                <th>Raised By</th>
                <th>Type</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id}>
                  <td><strong>#{d.id}</strong></td>
                  <td><span className="booking-ref">#{d.bookingId}</span></td>
                  <td>
                    <div className="user-cell">
                      <span>{d.raisedByName}</span>
                    </div>
                  </td>
                  <td><span className="type-badge">{d.type.replace('_', ' ')}</span></td>
                  <td>{getStatusBadge(d.status)}</td>
                  <td><span className="date-cell"><Calendar size={14} /> {new Date(d.createdAt).toLocaleDateString()}</span></td>
                  <td>
                    <div className="action-menu-container" ref={activeMenu === d.id ? menuRef : null}>
                      <button 
                        className={`action-dots-btn ${activeMenu === d.id ? 'active' : ''}`}
                        onClick={() => setActiveMenu(activeMenu === d.id ? null : d.id)}
                      >
                        <MoreVertical size={16} />
                      </button>
                      
                      {activeMenu === d.id && (
                        <div className="action-dropdown shadow">
                          <div className="dropdown-item" onClick={() => { setSelectedDispute(d); setActiveMenu(null); }}>
                            <Eye size={14} /> View Details
                          </div>
                          {d.status === 'OPEN' && (
                            <div className="dropdown-item mark-item" onClick={() => { handleAction(d.id, 'REVIEW'); setActiveMenu(null); }}>
                              <Shield size={14} /> Mark Review
                            </div>
                          )}
                          {(d.status === 'OPEN' || d.status === 'UNDER_REVIEW') && (
                            <>
                              <div className="dropdown-item resolve-item" onClick={() => { setSelectedDispute(d); setActiveMenu(null); }}>
                                <CheckCircle size={14} /> Resolve
                              </div>
                              <div className="dropdown-item reject-item" onClick={() => { setSelectedDispute(d); setActiveMenu(null); }}>
                                <XCircle size={14} /> Reject
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Action Modal */}
      {selectedDispute && (
        <div className="dispute-modal-overlay">
          <div className="dispute-modal-card fade-up">
            <div className="dispute-modal-header">
              <div className="header-content">
                <h3>Dispute #{selectedDispute.id}</h3>
                <span className="header-subtitle">{selectedDispute.type.replace('_', ' ')}</span>
              </div>
              <button className="close-x" onClick={() => setSelectedDispute(null)}><XCircle size={18} /></button>
            </div>

            <div className="dispute-modal-body">
              {/* Status Banner */}
              {selectedDispute.status === 'RESOLVED' && (
                <div className="dispute-banner banner-resolved">
                   <CheckCircle size={16} /> This dispute has been resolved
                </div>
              )}
              {selectedDispute.status === 'REJECTED' && (
                <div className="dispute-banner banner-rejected">
                   <XCircle size={16} /> This dispute has been rejected
                </div>
              )}

              <div className="dispute-info-grid">
                <div className="info-item">
                  <label>RAISED BY</label>
                  <p>👤 {selectedDispute.raisedByName}</p>
                </div>
                <div className="info-item">
                  <label>AGAINST</label>
                  <p>👤 {selectedDispute.raisedAgainstName}</p>
                </div>
                <div className="info-item">
                  <label>BOOKING</label>
                  <p>📋 #{selectedDispute.bookingId}</p>
                </div>
                <div className="info-item">
                  <label>STATUS</label>
                  <div>{getStatusBadge(selectedDispute.status)}</div>
                </div>
                <div className="info-item full-width">
                  <label>DATE RAISED</label>
                  <p>📅 {new Date(selectedDispute.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                </div>
              </div>

              <div className="dispute-desc-section">
                <label><MessageSquare size={14} /> Description</label>
                <div className="desc-box">
                  {selectedDispute.description}
                </div>
              </div>

              {(selectedDispute.status === 'OPEN' || selectedDispute.status === 'UNDER_REVIEW') && (
                <div className="admin-notes-section">
                  <label>Admin Resolution Notes</label>
                  <textarea 
                    placeholder="Provide resolution details or reason for rejection..."
                    value={adminNote}
                    onChange={e => setAdminNote(e.target.value)}
                  />
                </div>
              )}

              {(selectedDispute.status === 'RESOLVED' || selectedDispute.status === 'REJECTED') && (
                <div className="dispute-desc-section">
                  <label>Resolution Note</label>
                  <div className="desc-box note-box">
                    {selectedDispute.adminNote || 'No notes provided.'}
                  </div>
                </div>
              )}
            </div>

            <div className="dispute-modal-footer">
              {(selectedDispute.status === 'OPEN' || selectedDispute.status === 'UNDER_REVIEW') ? (
                <div className="footer-actions">
                  <button 
                    className="btn-outline-danger" 
                    onClick={() => handleAction(selectedDispute.id, 'REJECT')}
                    disabled={acting}
                  >
                    Reject Dispute
                  </button>
                  <button 
                    className="btn-gradient-success" 
                    onClick={() => handleAction(selectedDispute.id, 'RESOLVE')}
                    disabled={acting}
                  >
                    Resolve Dispute
                  </button>
                </div>
              ) : (
                <button className="sr-btn sr-btn-secondary" style={{ marginLeft: 'auto' }} onClick={() => setSelectedDispute(null)}>
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
