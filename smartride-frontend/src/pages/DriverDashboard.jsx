import { useState, useEffect } from 'react'
import { driverAPI, reviewAPI, disputeAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import WebSocketService from '../services/WebSocketService'
import toast from 'react-hot-toast'
import { Car, Plus, List, Users, MapPin, Calendar, Clock, IndianRupee, Loader, Play, CheckCircle, X, Trash2 } from 'lucide-react'
import ReviewModal from '../components/ReviewModal'
import DisputeModal from '../components/DisputeModal'
import DriverEarningsPage from './DriverEarningsPage'
import '../components/ReviewModal.css'
import './Dashboard.css'

const TABS = [
  { id: 'post', label: 'Post a Ride', icon: <Plus size={16} /> },
  { id: 'rides', label: 'My Rides', icon: <Car size={16} /> },
  { id: 'bookings', label: 'Bookings Received', icon: <Users size={16} /> },
  { id: 'earnings', label: 'Earnings', icon: <span>💰</span> },
]

const STATUS_COLORS = {
  PENDING: '#f39c12',
  DRIVER_ASSIGNED: '#3498db',
  RIDE_STARTED: '#9b59b6',
  RIDE_COMPLETED: '#27ae60',
  CANCELLED: '#e74c3c',
}

const BOOKING_STATUS_COLORS = {
  PENDING_PAYMENT: '#f39c12',
  PAID: '#2ecc71',
  CONFIRMED: '#3498db',
  COMPLETED: '#27ae60',
  CANCELLED: '#e74c3c',
}

export default function DriverDashboard() {
  const { user } = useAuth()
  const [tab, setTab] = useState('post')
  const [rides, setRides] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState({})
  const [showCancelModal, setShowCancelModal] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [driverRating, setDriverRating] = useState(0)
  const [driverReviewCount, setDriverReviewCount] = useState(0)

  // ─── Review State ──────────────────────────────────────────────────────────
  const [reviewStatuses, setReviewStatuses] = useState({}) // { bookingId: true/false }
  const [reviewModalBooking, setReviewModalBooking] = useState(null)

  // ─── Dispute State ──────────────────────────────────────────────────────────
  const [disputeStatuses, setDisputeStatuses] = useState({}) // { bookingId: true/false }
  const [disputeModalBooking, setDisputeModalBooking] = useState(null)

  const [form, setForm] = useState({
    source: '',
    destination: '',
    date: '',
    time: '',
    seats: '',
    price: '',
    baseFare: '',
    farePerKm: '',
  })
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  // Initialize WebSocket
  useEffect(() => {
    WebSocketService.connect(
      () => {
        console.log('✅ WebSocket connected')
        if (user?.id) {
          WebSocketService.subscribeToDriverBookings(user.id, handleBookingUpdate)
        }
      },
      (error) => console.error('WebSocket error:', error)
    )
    return () => WebSocketService.disconnect()
  }, [user])

  const handleBookingUpdate = (message) => {
    console.log('📢 Booking update:', message)
    if (tab === 'rides') fetchRides()
    if (tab === 'bookings') fetchBookings()
    toast.success(message.message)
  }

  useEffect(() => {
    if (tab === 'rides') fetchRides()
    if (tab === 'bookings') fetchBookings()
  }, [tab])

  useEffect(() => {
    if (user?.id) {
      fetchDriverRating()
    }
  }, [user])

  const fetchDriverRating = async () => {
    try {
      const avgRes = await reviewAPI.getAverageRating(user.id)
      const reviewsRes = await reviewAPI.getReviewsForUser(user.id)
      setDriverRating(avgRes.data || 0)
      setDriverReviewCount(reviewsRes.data?.length || 0)
    } catch (err) {
      console.error('Failed to fetch driver rating:', err)
    }
  }

  const fetchRides = async () => {
    setDataLoading(true)
    try {
      const res = await driverAPI.myRides()
      setRides(res.data)
    } catch { toast.error('Failed to load rides') }
    finally { setDataLoading(false) }
  }

  const fetchBookings = async () => {
    setDataLoading(true)
    try {
      const res = await driverAPI.bookings()
      setBookings(res.data)

      // Fetch user's disputes
      try {
        const dRes = await disputeAPI.getMyDisputes()
        const dMap = {}
        dRes.data.forEach(d => {
          dMap[d.bookingId] = true
        })
        setDisputeStatuses(dMap)
      } catch (err) {
        console.error('Failed to load disputes:', err)
      }

      // Check review status for completed bookings
      const completedBookings = res.data.filter(b => b.status === 'COMPLETED' || b.status === 'RIDE_COMPLETED' || b.rideStatus === 'RIDE_COMPLETED')
      const statusChecks = {}
      await Promise.all(
        completedBookings.map(async (b) => {
          try {
            const checkRes = await reviewAPI.hasReviewed(b.bookingId)
            statusChecks[b.bookingId] = checkRes.data.hasReviewed
          } catch {
            statusChecks[b.bookingId] = false
          }
        })
      )
      setReviewStatuses(prev => ({ ...prev, ...statusChecks }))
    } catch { toast.error('Failed to load bookings') }
    finally { setDataLoading(false) }
  }

  const fetchCoordinates = async (location) => {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`
    )
    const data = await res.json()
    if (!data.length) throw new Error('Location not found')
    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
    }
  }

  const handlePostRide = async (e) => {
    e.preventDefault()
    if (
      !form.source ||
      !form.destination ||
      !form.date ||
      !form.time ||
      !form.seats ||
      !form.price ||
      !form.baseFare ||
      !form.farePerKm
    ) {
      toast.error('Please fill all fields')
      return
    }
    setLoading(true)
    try {
      const pickup = await fetchCoordinates(form.source)
      const drop = await fetchCoordinates(form.destination)

      await driverAPI.postRide({
        source: form.source,
        destination: form.destination,
        date: form.date,
        time: form.time + ':00',
        seats: parseInt(form.seats),
        price: parseFloat(form.price),
        baseFare: parseFloat(form.baseFare),
        farePerKm: parseFloat(form.farePerKm),
        pickupLat: pickup.lat,
        pickupLon: pickup.lon,
        dropLat: drop.lat,
        dropLon: drop.lon,
      })
      toast.success('✅ Ride posted successfully!')
      setForm({
        source: '',
        destination: '',
        date: '',
        time: '',
        seats: '',
        price: '',
        baseFare: '',
        farePerKm: '',
      })
      setTab('rides')
      fetchRides()
    } catch (err) {
      if (err.message === 'Location not found') {
        toast.error('Please enter valid locations for From and To')
      } else {
        const msg = err.response?.data?.message || 'Failed to post ride'
        toast.error(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  // ACTION HANDLERS
  const handleAcceptRide = async (rideId) => {
    setActionLoading(prev => ({ ...prev, [rideId]: 'accept' }))
    try {
      await driverAPI.acceptRide(rideId)
      toast.success('✅ Ride accepted! Heading to pickup location.')
      fetchRides()
      fetchBookings()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept ride')
    } finally {
      setActionLoading(prev => ({ ...prev, [rideId]: null }))
    }
  }

  const handleStartRide = async (rideId) => {
    // Guard: Check current status in local state
    const currentRide = rides.find(r => r.id === rideId)
    if (currentRide?.status === 'RIDE_STARTED') {
      toast.error('⚠️ Ride already started! Use "End Ride" to complete it.')
      return
    }
    
    setActionLoading(prev => ({ ...prev, [rideId]: 'start' }))
    try {
      await driverAPI.startRide(rideId)
      toast.success('🚗 Ride started! On your way to destination.')
      // Update local state immediately - change status to RIDE_STARTED
      setRides(prev => prev.map(r => r.id === rideId ? {...r, status: 'RIDE_STARTED'} : r))
      fetchBookings() // Sync bookings table
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start ride')
    } finally {
      setActionLoading(prev => ({ ...prev, [rideId]: null }))
    }
  }

  const handleCompleteRide = async (rideId) => {
    setActionLoading(prev => ({ ...prev, [rideId]: 'complete' }))
    try {
      await driverAPI.completeRide(rideId)
      toast.success('✅ Ride completed! Receipt sent to passenger.')
      // Update local state immediately - change status to RIDE_COMPLETED
      setRides(prev => prev.map(r => r.id === rideId ? {...r, status: 'RIDE_COMPLETED'} : r))
      fetchBookings() // Sync bookings table
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete ride')
    } finally {
      setActionLoading(prev => ({ ...prev, [rideId]: null }))
    }
  }

  const handleCancelRide = async (rideId) => {
    if (!cancelReason.trim()) {
      toast.error('Please provide a reason for cancellation')
      return
    }
    setActionLoading(prev => ({ ...prev, [rideId]: 'cancel' }))
    try {
      await driverAPI.cancelRide(rideId, cancelReason)
      toast.error('❌ Ride cancelled.')
      fetchRides()
      fetchBookings()
      setShowCancelModal(null)
      setCancelReason('')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel ride')
    } finally {
      setActionLoading(prev => ({ ...prev, [rideId]: null }))
    }
  }

  const handleDeleteRide = async (rideId) => {
    if (!window.confirm('Are you sure you want to delete this completed ride?')) return
    
    setActionLoading(prev => ({ ...prev, [rideId]: 'delete' }))
    try {
      await driverAPI.deleteRide(rideId)
      toast.success('🗑️ Ride deleted successfully')
      // Remove ride from local state immediately
      setRides(prev => prev.filter(r => r.id !== rideId))
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete ride')
    } finally {
      setActionLoading(prev => ({ ...prev, [rideId]: null }))
    }
  }

  const getActionButtons = (ride) => {
    const isLoading = (action) => actionLoading[ride.id] === action
    
    return (
      <div className="ride-actions">
        {ride.status === 'PENDING' && (
          <button
            className="btn-action btn-accept"
            onClick={() => handleAcceptRide(ride.id)}
            disabled={isLoading('accept')}
          >
            {isLoading('accept') ? <Loader size={14} className="spin" /> : <CheckCircle size={14} />}
            {isLoading('accept') ? 'Accepting...' : 'Accept'}
          </button>
        )}

        {ride.status === 'DRIVER_ASSIGNED' && (
          <button
            className="btn-action btn-start"
            onClick={() => handleStartRide(ride.id)}
            disabled={isLoading('start')}
          >
            {isLoading('start') ? <Loader size={14} className="spin" /> : <Play size={14} />}
            {isLoading('start') ? 'Starting...' : 'Start Ride'}
          </button>
        )}

        {ride.status === 'RIDE_STARTED' && (
          <>
            <button
              className="btn-action btn-complete"
              onClick={() => handleCompleteRide(ride.id)}
              disabled={isLoading('complete')}
            >
              {isLoading('complete') ? <Loader size={14} className="spin" /> : <CheckCircle size={14} />}
              {isLoading('complete') ? 'Completing...' : 'Complete'}
            </button>
            <button
              className="btn-action btn-cancel"
              onClick={() => setShowCancelModal(ride.id)}
              disabled={isLoading('cancel')}
            >
              <X size={14} />
              Cancel
            </button>
          </>
        )}

        {ride.status === 'RIDE_COMPLETED' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="badge" style={{ backgroundColor: STATUS_COLORS[ride.status] }}>
              {ride.status}
            </span>
            <button
              className="btn-delete-ride"
              onClick={() => handleDeleteRide(ride.id)}
              disabled={isLoading('delete')}
              title="Delete completed ride"
            >
              {isLoading('delete') ? <Loader size={16} className="spin" /> : <Trash2 size={16} />}
            </button>
          </div>
        )}

        {ride.status === 'CANCELLED' && (
          <span className="badge" style={{ backgroundColor: STATUS_COLORS[ride.status] }}>
            {ride.status}
          </span>
        )}
      </div>
    )
  }

  const getBookingAction = (booking) => {
    const rideStatus = booking.rideStatus || booking.status

    if (booking.status === 'PENDING_PAYMENT') {
      return <span className="text-muted">Waiting for payment</span>
    }

    if (rideStatus === 'PENDING') {
      return (
        <button
          className="btn-action btn-accept table-action"
          onClick={() => handleAcceptRide(booking.rideId)}
          disabled={actionLoading[booking.rideId] === 'accept'}
        >
          {actionLoading[booking.rideId] === 'accept' ? <Loader size={12} className="spin" /> : <CheckCircle size={12} />}
          Accept
        </button>
      )
    }

    if (rideStatus === 'DRIVER_ASSIGNED') {
      return (
        <button
          className="btn-action btn-start table-action"
          onClick={() => handleStartRide(booking.rideId)}
          disabled={actionLoading[booking.rideId] === 'start'}
        >
          {actionLoading[booking.rideId] === 'start' ? <Loader size={12} className="spin" /> : <Play size={12} />}
          Start Ride
        </button>
      )
    }

    if (rideStatus === 'RIDE_STARTED') {
      return (
        <button
          className="btn-action btn-complete table-action"
          onClick={() => handleCompleteRide(booking.rideId)}
          disabled={actionLoading[booking.rideId] === 'complete'}
        >
          {actionLoading[booking.rideId] === 'complete' ? <Loader size={12} className="spin" /> : <CheckCircle size={12} />}
          Complete
        </button>
      )
    }

    return <span className="text-muted">No action</span>
  }

  return (
    <div className="dashboard-page driver-dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Driver Dashboard</h1>
          <p className="dashboard-sub">Manage your rides and view passenger bookings</p>
        </div>
        <div className="dashboard-avatar">
          <Car size={20} />
          <div>
            <div className="avatar-name">{user?.name || 'Driver'}</div>
            <div className="avatar-role" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              Driver
              <span className="header-rating-divider">|</span>
              {driverRating > 0 ? (
                <span>⭐ {driverRating.toFixed(1)}
                  ({driverReviewCount} reviews)
                </span>
              ) : (
                <span>No ratings yet</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="dash-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`dash-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <div className="dash-content fade-up">
        {/* EARNINGS */}
        {tab === 'earnings' && <DriverEarningsPage />}

        {/* POST RIDE */}
        {tab === 'post' && (
          <div className="dash-panel">
            <div className="panel-header">
              <Plus size={20} />
              <div>
                <h2>Post a New Ride</h2>
                <p>Fill in the details to offer a ride to passengers</p>
              </div>
            </div>
            <form onSubmit={handlePostRide} className="ride-form">
              <div className="form-row-2">
                <div className="form-group">
                  <label className="sr-label">From</label>
                  <div className="input-wrap">
                    <MapPin size={15} className="input-icon" />
                    <input className="sr-input pl-icon" placeholder="Pickup city" value={form.source} onChange={set('source')} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="sr-label">To</label>
                  <div className="input-wrap">
                    <MapPin size={15} className="input-icon" />
                    <input className="sr-input pl-icon" placeholder="Drop city" value={form.destination} onChange={set('destination')} />
                  </div>
                </div>
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label className="sr-label">Date</label>
                  <div className="input-wrap">
                    <Calendar size={15} className="input-icon" />
                    <input className="sr-input pl-icon" type="date" value={form.date} onChange={set('date')} min={new Date().toISOString().split('T')[0]} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="sr-label">Time</label>
                  <div className="input-wrap">
                    <Clock size={15} className="input-icon" />
                    <input className="sr-input pl-icon" type="time" value={form.time} onChange={set('time')} />
                  </div>
                </div>
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label className="sr-label">Available Seats</label>
                  <input
                    className="sr-input"
                    type="number"
                    min="1"
                    max="8"
                    placeholder="e.g. 3"
                    value={form.seats}
                    onChange={set('seats')}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="sr-label">Price per Seat (₹)</label>
                  <div className="input-wrap">
                    <IndianRupee size={15} className="input-icon" />
                    <input
                      className="sr-input pl-icon"
                      type="number"
                      min="0"
                      placeholder="e.g. 350"
                      value={form.price}
                      onChange={set('price')}
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label className="sr-label">Base Fare (₹)</label>
                  <input
                    className="sr-input"
                    type="number"
                    step="0.01"
                    placeholder="e.g. 50"
                    value={form.baseFare}
                    onChange={set('baseFare')}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="sr-label">Fare Per Km (₹)</label>
                  <input
                    className="sr-input"
                    type="number"
                    step="0.01"
                    placeholder="e.g. 10"
                    value={form.farePerKm}
                    onChange={set('farePerKm')}
                    required
                  />
                </div>
              </div>
              <button type="submit" className="sr-btn sr-btn-primary" style={{ alignSelf: 'flex-start', padding: '13px 28px' }} disabled={loading}>
                {loading ? <span className="spinner" /> : <Plus size={16} />}
                {loading ? 'Posting...' : 'Post Ride'}
              </button>
            </form>
          </div>
        )}

        {/* MY RIDES */}
        {tab === 'rides' && (
          <div className="dash-panel">
            <div className="panel-header">
              <Car size={20} />
              <div>
                <h2>My Posted Rides</h2>
                <p>All rides you've offered to passengers</p>
              </div>
            </div>
            {dataLoading ? (
              <div className="loading-state"><Loader size={24} className="spin" /> Loading rides...</div>
            ) : rides.length === 0 ? (
              <div className="empty-state">
                <Car size={40} />
                <p>No rides posted yet</p>
                <button className="sr-btn sr-btn-primary" onClick={() => setTab('post')}>
                  <Plus size={15} /> Post your first ride
                </button>
              </div>
            ) : (
              <div className="rides-grid">
                {rides.map(ride => (
                  <div key={ride.id} className="ride-card-enhanced">
                    <div className="ride-status-badge" style={{ backgroundColor: STATUS_COLORS[ride.status] }}>
                      {ride.status}
                    </div>
                    
                    <div className="ride-route">
                      <span className="ride-city">{ride.source}</span>
                      <div className="ride-arrow">→</div>
                      <span className="ride-city">{ride.destination}</span>
                    </div>

                    <div className="ride-meta">
                      <span><Calendar size={13} /> {ride.date}</span>
                      <span><Clock size={13} /> {ride.time}</span>
                      <span><Users size={13} /> {ride.availableSeats} seats left</span>
                      <span className="ride-price"><IndianRupee size={13} />₹{Math.round(ride.calculatedFarePerSeat || ride.price || 0)} / seat</span>
                    </div>

                    {getActionButtons(ride)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* BOOKINGS RECEIVED */}
        {tab === 'bookings' && (
          <div className="dash-panel">
            <div className="panel-header">
              <Users size={20} />
              <div>
                <h2>Bookings Received</h2>
                <p>Passengers who booked your rides</p>
              </div>
            </div>
            {dataLoading ? (
              <div className="loading-state"><Loader size={24} className="spin" /> Loading bookings...</div>
            ) : bookings.length === 0 ? (
              <div className="empty-state">
                <Users size={40} />
                <p>No bookings yet</p>
              </div>
            ) : (
              <div className="bookings-table-wrap">
                <table className="bookings-table">
                  <thead>
                    <tr>
                      <th>Passenger</th>
                      <th>Route</th>
                      <th>Date & Time</th>
                      <th>Seats</th>
                      <th>Fare</th>
                      <th>Status</th>
                      <th>Action</th>
                      <th>Review</th>
                      <th>Dispute</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map(b => (
                      <tr key={b.bookingId}>
                        <td><span className="passenger-name">{b.passengerName}</span></td>
                        <td>{b.source} → {b.destination}</td>
                        <td>{b.date} {b.time}</td>
                        <td>{b.seatCount}</td>
                        <td>₹{b.totalFare}</td>
                        <td>
                          <span className="badge" style={{ backgroundColor: STATUS_COLORS[b.rideStatus] || BOOKING_STATUS_COLORS[b.status] || '#64748b' }}>
                            {b.rideStatus || b.status}
                          </span>
                        </td>
                        <td>{getBookingAction(b)}</td>
                        <td>
                          {(b.status === 'COMPLETED' || b.status === 'RIDE_COMPLETED' || b.rideStatus === 'RIDE_COMPLETED') ? (
                            reviewStatuses[b.bookingId] ? (
                              <span className="reviewed-badge">✓ Reviewed</span>
                            ) : (
                              <button
                                className="review-rate-btn"
                                onClick={() => setReviewModalBooking(b)}
                              >
                                ⭐ Rate Passenger
                              </button>
                            )
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td>
                          {(b.status === 'COMPLETED' || b.status === 'RIDE_COMPLETED' || b.rideStatus === 'RIDE_COMPLETED' || b.status === 'CANCELLED') && (
                            <>
                              {disputeStatuses[b.bookingId] ? (
                                <span className="dispute-raised-badge">🚨 Raised</span>
                              ) : (
                                <button
                                  className="sr-btn sr-btn-ghost"
                                  style={{ padding: '6px 10px', fontSize: '11px' }}
                                  onClick={() => setDisputeModalBooking(b)}
                                >
                                  🚨 Dispute
                                </button>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CANCEL MODAL */}
      {/* Review Modal */}
      {reviewModalBooking && (
        <ReviewModal
          booking={reviewModalBooking}
          revieweeName={reviewModalBooking.passengerName}
          onClose={() => setReviewModalBooking(null)}
          onSuccess={() => {
            setReviewStatuses(prev => ({ ...prev, [reviewModalBooking.bookingId]: true }))
            setReviewModalBooking(null)
          }}
        />
      )}

      {/* Dispute Modal */}
      {disputeModalBooking && (
        <DisputeModal
          bookingId={disputeModalBooking.bookingId}
          onClose={() => setDisputeModalBooking(null)}
          onSuccess={() => {
            setDisputeStatuses(prev => ({ ...prev, [disputeModalBooking.bookingId]: true }))
            setDisputeModalBooking(null)
          }}
        />
      )}

      {showCancelModal && (
        <div className="modal-overlay" onClick={() => setShowCancelModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Cancel Ride?</h3>
            <p>Please provide a reason for cancellation</p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g., Vehicle breakdown, Emergency, Change of plans"
              rows="4"
              className="sr-input"
            />
            <div className="modal-actions">
              <button
                className="sr-btn sr-btn-secondary"
                onClick={() => {
                  setShowCancelModal(null)
                  setCancelReason('')
                }}
              >
                Keep Ride
              </button>
              <button
                className="sr-btn sr-btn-danger"
                onClick={() => handleCancelRide(showCancelModal)}
                disabled={actionLoading[showCancelModal] === 'cancel'}
              >
                {actionLoading[showCancelModal] === 'cancel' ? 'Cancelling...' : 'Cancel Ride'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
