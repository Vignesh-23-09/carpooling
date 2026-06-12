import { useState, useEffect, useRef } from 'react'
import { passengerAPI, paymentAPI, fareAPI, reviewAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import webSocketClient from '../utils/websocket'
import toast from 'react-hot-toast'
import {
  Search, List, MapPin, Calendar, Clock, IndianRupee,
  Users, Car, Filter, X, Loader, CheckCircle, XCircle, Trash2
} from 'lucide-react'
import searchAnimation from '../assets/search-animation.json'
import Lottie from 'lottie-react'
import ReviewModal from '../components/ReviewModal'
import RatingDisplay from '../components/RatingDisplay'
import DisputeModal from '../components/DisputeModal'
import '../components/ReviewModal.css'
import './Dashboard.css'

const STATUS_COLORS = {
  PENDING: '#f39c12',
  DRIVER_ASSIGNED: '#3498db',
  RIDE_STARTED: '#9b59b6',
  RIDE_COMPLETED: '#2ecc71',
  CANCELLED: '#e74c3c',
}

const BOOKING_STATUS_COLORS = {
  PENDING_PAYMENT: '#f39c12',
  PAID: '#2ecc71',
  CONFIRMED: '#3498db',
  COMPLETED: '#27ae60',
  CANCELLED: '#e74c3c',
}

// Custom hook for loading Razorpay SDK
const useRazorpay = () => {
  const [razorpayLoaded, setRazorpayLoaded] = useState(false)
  const [razorpayError, setRazorpayError] = useState(null)

  useEffect(() => {
    // Check if Razorpay is already loaded (from index.html)
    if (window.Razorpay) {
      setRazorpayLoaded(true)
      return
    }

    // If not loaded yet, wait for it
    const checkLoaded = () => {
      if (window.Razorpay) {
        setRazorpayLoaded(true)
      } else {
        setTimeout(checkLoaded, 100)
      }
    }
    checkLoaded()

    // Set error if not loaded within 10 seconds
    const timeout = setTimeout(() => {
      if (!window.Razorpay) {
        setRazorpayError('Failed to load Razorpay SDK')
      }
    }, 10000)

    return () => clearTimeout(timeout)
  }, [])

  return { razorpayLoaded, razorpayError }
}

const TABS = [
  { id: 'search', label: 'Find a Ride', icon: <Search size={16} /> },
  { id: 'bookings', label: 'My Bookings', icon: <List size={16} /> },
]

export default function PassengerDashboard() {
  const { user } = useAuth()
  const { razorpayLoaded, razorpayError } = useRazorpay()
  const [tab, setTab] = useState('search')
  const [searchForm, setSearchForm] = useState({
    source: '', destination: '', date: '',
    minPrice: '', maxPrice: ''
  })
  const [results, setResults] = useState([])
  const [searched, setSearched] = useState(false)
  const [searching, setSearching] = useState(false)
  const [bookingId, setBookingId] = useState(null)
  const [seatCounts, setSeatCounts] = useState({})
  const [bookings, setBookings] = useState([])
  const [dataLoading, setDataLoading] = useState(false)
  const [cancelling, setCancelling] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  const [paymentInProgress, setPaymentInProgress] = useState(false)
  const [fareEstimation, setFareEstimation] = useState(null)
  const [estimatingFare, setEstimatingFare] = useState(false)
  const [rideStatuses, setRideStatuses] = useState({}) // Track ride status updates
  const [ridesLoaded, setRidesLoaded] = useState(false)
  const [animationComplete, setAnimationComplete] = useState(false)
  const animationTimeoutRef = useRef(null)
  const searchTimeoutRef = useRef(null)

  // ─── Review State ──────────────────────────────────────────────────────────
  const [reviewStatuses, setReviewStatuses] = useState({}) // { bookingId: true/false }
  const [reviewModalBooking, setReviewModalBooking] = useState(null)

  // ─── Dispute State ──────────────────────────────────────────────────────────
  const [disputeStatuses, setDisputeStatuses] = useState({}) // { bookingId: true/false }
  const [disputeModalBooking, setDisputeModalBooking] = useState(null)

  const set = (k) => (e) => setSearchForm(f => ({ ...f, [k]: e.target.value }))

  // Initialize WebSocket connection
  useEffect(() => {
    if (!webSocketClient.isConnected()) {
      webSocketClient.connect(() => {
        console.log('WebSocket connected to RideStatusPublisher')
      })
    }

    // Subscribe to ride status updates for each booking
    if (bookings.length > 0) {
      bookings.forEach(booking => {
        webSocketClient.subscribeToRideStatus(booking.rideId, (update) => {
          setRideStatuses(prev => ({
            ...prev,
            [booking.rideId]: update
          }))
          
          // Show toast notification for important status changes
          if (update.status === 'DRIVER_ASSIGNED') {
            toast.success('Driver assigned! Heading to pickup.', { icon: '🚗' })
          } else if (update.status === 'RIDE_STARTED') {
            toast.success('Ride started!', { icon: '🚙' })
          } else if (update.status === 'RIDE_COMPLETED') {
            toast.success('Ride completed. Thank you!', { icon: '✅' })
          }
        })
      })
    }

    // Cleanup on unmount
    return () => {
      if (bookings.length > 0) {
        bookings.forEach(booking => {
          webSocketClient.unsubscribeFromRideStatus(booking.rideId)
        })
      }
    }
  }, [bookings])

  useEffect(() => {
    if (tab === 'bookings' && user) fetchBookings()
  }, [tab, user])

  // Auto-estimate fare when both source and destination are entered
  useEffect(() => {
    const { source, destination } = searchForm
    if (!source || !destination) {
      setFareEstimation(null)
      return
    }

    // Debounce the API call to avoid excessive requests
    const debounceTimer = setTimeout(() => {
      console.log('🚗 Auto-estimating fare for:', source, '→', destination)
      estimateFare()
    }, 500) // 500ms delay to let user finish typing

    return () => clearTimeout(debounceTimer)
  }, [searchForm.source, searchForm.destination])

  const fetchBookings = async () => {
    setDataLoading(true)
    try {
      const res = await passengerAPI.myBookings()
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

      // Check review status for all completed bookings
      // Note: booking status may stay CONFIRMED even when ride is RIDE_COMPLETED
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

  const estimateFare = async () => {
    const { source, destination } = searchForm
    if (!source || !destination) {
      return
    }

    setEstimatingFare(true)
    try {
      const res = await fareAPI.estimateFareByCities({
        sourceCity: source,
        destinationCity: destination
      })
      setFareEstimation(res.data)
    } catch (err) {
      console.error('Fare estimation failed:', err)
      setFareEstimation(null)
    } finally {
      setEstimatingFare(false)
    }
  }

  const openPayment = (orderData, bookingId) => {
    if (paymentInProgress) {
      toast.error('Payment already in progress')
      return
    }

    if (!razorpayLoaded) {
      toast.error('Payment SDK loading...')
      return
    }

    if (razorpayError) {
      toast.error(razorpayError)
      return
    }

    if (!window.Razorpay) {
      toast.error('Payment SDK not available')
      return
    }

    setPaymentInProgress(true)

    // Sanitize passenger details for Razorpay validation
    const passengerName = sanitizeNameForRazorpay(user?.name)
    const passengerEmail = sanitizeEmailForRazorpay(user?.email)
    const passengerPhone = sanitizePhoneForRazorpay(user?.phone || '9999999999')

    console.log('=== RAZORPAY PAYMENT OPTIONS ===')
    console.log('Original name:', user?.name)
    console.log('Sanitized name:', passengerName)
    console.log('Original email:', user?.email)
    console.log('Sanitized email:', passengerEmail)
    console.log('Original phone:', user?.phone)
    console.log('Sanitized phone:', passengerPhone)
    console.log('Order ID:', orderData.orderId)
    console.log('Amount:', orderData.amount)

    const options = {
      key: orderData.razorpayKey || orderData.keyId,
      amount: orderData.amount,
      currency: orderData.currency || 'INR',
      order_id: orderData.orderId,
      name: 'SmartRide',
      description: 'Ride Payment',
      image: '/favicon.svg',
      handler: async function (response) {
        console.log('=== PAYMENT SUCCESS HANDLER ===')
        console.log('Payment Response:', response)
        
        try {
          // Step 1: Verify payment with backend
          console.log('Step 1: Verifying payment...')
          setPaymentInProgress(true)
          
          const verifyRes = await paymentAPI.verifyPayment({
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
            bookingId: bookingId,
          })
          
          console.log('Payment verified successfully!')
          toast.success('✓ Payment verified. Confirming your booking...')
          
          // Step 2: Confirm booking after payment success
          console.log('Step 2: Confirming booking...')
          const confirmRes = await passengerAPI.confirmBooking(bookingId)
          
          console.log('Booking confirmed:', confirmRes.data)
          toast.success('✓ Booking confirmed! Driver will be assigned shortly.')
          
          // Step 3: Refresh bookings to show updated status
          console.log('Step 3: Refreshing bookings...')
          await fetchBookings()
          
          // Re-fetch search results to show correct seat counts
          if (searched) {
             handleSearch({ preventDefault: () => {} });
          }
          
          // Switch to bookings tab to show confirmation
          setTab('bookings')
          setPaymentInProgress(false)
          console.log('=== PAYMENT SUCCESS HANDLER END ===')
        } catch (err) {
          console.error('Payment post-verification error:', err)
          console.log('Error details:', err.response?.data)
          
          toast.error(err.response?.data?.message || 'Payment verification failed')
          
          // Show error but don't close payment in progress - let user retry
          setPaymentInProgress(false)
        }
      },
      prefill: {
        name: passengerName,      // NEVER null or empty
        email: passengerEmail,
        contact: passengerPhone
      },
      theme: {
        color: '#2563eb',
      },
      modal: {
        ondismiss: function() {
          console.log('=== PAYMENT DISMISSED ===')
          setPaymentInProgress(false)
          toast.info('Payment cancelled. Your booking has been reserved for 10 minutes.')
        },
        confirm_close: true,
        escape: true,
      },
      callback_url: undefined,
      redirect: false,
      retry: {
        enabled: false,
      },
      timeout: 600,  // 10 minutes
      remember_customer: false,
      readonly: {
        email: true,
        name: true,
        contact: true,
      }
    }

    try {
      console.log('Opening Razorpay checkout...')
      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (error) {
      console.error('Razorpay error:', error)
      toast.error('Failed to open payment gateway')
      setPaymentInProgress(false)
    }
  }


  const LOADER_MESSAGES = [
    'Searching for available rides...',
    'Searching nearby drivers...',
    'Checking route availability...',
    'Finding the best ride for you...',
  ]

  const [loaderMessageIndex, setLoaderMessageIndex] = useState(0)

  useEffect(() => {
    if (!searching) return

    setLoaderMessageIndex(0)
    const interval = setInterval(() => {
      setLoaderMessageIndex(i => (i + 1) % LOADER_MESSAGES.length)
    }, 1200)

    return () => clearInterval(interval)
  }, [searching])

  // Synchronize animation and API results
  useEffect(() => {
    if (searching && ridesLoaded && animationComplete) {
      console.log('✅ Animation and search both complete. Showing results.')
      setSearching(false)
      setSearched(true)
      // Reset triggers for next search
      setRidesLoaded(false)
      setAnimationComplete(false)
    }
  }, [searching, ridesLoaded, animationComplete])

  // Fallback: ensure the loader doesn't get stuck if the animation event isn't fired
  useEffect(() => {
    if (!searching) {
      // Clear if search was cancelled or completed
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current)
        animationTimeoutRef.current = null
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
        searchTimeoutRef.current = null
      }
      return
    }

    if (searching && ridesLoaded && !animationComplete) {
      // Force completion after a short delay so the UI doesn't get stuck
      // Keep the loading overlay visible for ~6 seconds total
      animationTimeoutRef.current = window.setTimeout(() => {
        console.warn('⚠️ Animation did not complete in time; forcing completion')
        setAnimationComplete(true)
      }, 6000)
    }

    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current)
        animationTimeoutRef.current = null
      }
    }
  }, [searching, ridesLoaded, animationComplete])

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchForm.source || !searchForm.destination || !searchForm.date) {
      toast.error('Source, destination and date are required')
      return
    }

    console.log('🔍 Starting search...')
    setSearching(true)
    setSearched(false)
    setResults([])
    setFareEstimation(null)
    setRidesLoaded(false)
    setAnimationComplete(false)

    // Ensure the overlay disappears after 6s even if the animation event doesn't fire
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    searchTimeoutRef.current = window.setTimeout(() => {
      console.warn('⚠️ Search dialog timed out; hiding overlay')
      setSearching(false)
      setSearched(true)
    }, 6000)

    const payload = {
      source: searchForm.source,
      destination: searchForm.destination,
      date: searchForm.date,
      ...(searchForm.minPrice && { minPrice: parseFloat(searchForm.minPrice) }),
      ...(searchForm.maxPrice && { maxPrice: parseFloat(searchForm.maxPrice) }),
    }

    try {
      console.log('📤 Search payload:', payload)
      // Initializing search API call in parallel with animation already running
      const res = await passengerAPI.searchRides(payload)
      console.log('📥 Search response received:', res.data?.length, 'rides')

      if (!res.data || !Array.isArray(res.data)) {
        console.error('❌ Response data invalid format')
        setResults([])
      } else {
        setResults(res.data)
        // Optionally estimate fare if results found
        if (res.data.length > 0) {
          try {
            const fareRes = await fareAPI.estimateFareByCities({
              sourceCity: searchForm.source,
              destinationCity: searchForm.destination
            })
            setFareEstimation(fareRes.data)
          } catch (fareErr) {
            console.warn('⚠️ Fare estimation failed:', fareErr.message)
          }
        }
      }
      // Mark data as loaded, but wait for animation onLoopComplete
      setRidesLoaded(true)

    } catch (err) {
      console.error('❌ Search error:', err)
      toast.error(err.response?.data?.message || err.message || 'Search failed')
      setResults([])
      setRidesLoaded(true) // Allow animation to finish even on error
    }
    // Note: setSearching(false) is now handled by the sync useEffect
  }

  const handleBook = async (rideId) => {
    if (paymentInProgress) {
      toast.error('Payment already in progress')
      return
    }

    const seats = seatCounts[rideId] || 1
    setBookingId(rideId)
    try {
      const res = await passengerAPI.bookRide({
        rideId,
        seatCount: seats,
        sourceCity: searchForm.source,
        destinationCity: searchForm.destination
      })

      const booking = res.data
      let createdBookingId = booking?.bookingId || booking?.id

      // Fallback: try to extract booking id from a plain message, if backend still returns string
      if (!createdBookingId && typeof booking === 'string') {
        const match = booking.match(/#(\d+)/)
        if (match) createdBookingId = parseInt(match[1], 10)
      }

      if (!createdBookingId) {
        toast.success(typeof booking === 'string' ? booking : 'Booking initiated!');
      } else {
        toast.success('Wait! Let\'s finish the payment to confirm your seat.');
        const orderRes = await paymentAPI.createOrder(createdBookingId)
        openPayment(orderRes.data, createdBookingId)
      }

      // Note: Seat deduction now happens only after successful payment 
      // results are automatically updated via search refresh after payment.
    } catch (err) {
      const errorData = err.response?.data
      if (errorData?.error?.reason === 'international_transaction_not_allowed') {
        toast.error('International cards are not supported. Please use a local Indian card or contact support for assistance.')
      } else {
        toast.error(errorData?.message || errorData?.error?.description || 'Booking failed')
      }
    } finally {
      setBookingId(null)
    }
  }

  const handleCancel = async (bookingId) => {
    if (!window.confirm('Cancel this booking? Seats will be restored.')) return
    setCancelling(bookingId)
    try {
      const res = await passengerAPI.cancelBooking(bookingId)
      toast.success(res.data)
      setBookings(prev => prev.map(b =>
        b.bookingId === bookingId ? { ...b, status: 'CANCELLED' } : b
      ))
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cancel failed')
    } finally {
      setCancelling(null)
    }
  }

  const handleDelete = async (bookingId) => {
    if (!window.confirm('Are you sure you want to delete this booking? This action cannot be undone.')) return
    setDeleting(bookingId)
    try {
      const res = await passengerAPI.deleteBooking(bookingId)
      toast.success('Booking deleted successfully')
      setBookings(prev => prev.filter(b => b.bookingId !== bookingId))
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed')
    } finally {
      setDeleting(null)
    }
  }

  const handleDeleteRide = async (rideId, bookingId) => {
    if (!window.confirm('Are you sure you want to delete this ride? This action cannot be undone and will delete all associated bookings.')) return
    setDeleting(bookingId)
    try {
      const res = await passengerAPI.deleteRide(rideId)
      toast.success('Ride deleted successfully')
      setBookings(prev => prev.filter(b => b.rideId !== rideId))
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed')
    } finally {
      setDeleting(null)
    }
  }

  /**
   * Sanitize passenger name for Razorpay
   * Razorpay only accepts: letters, spaces, hyphens, periods
   * No numbers, special characters, or symbols
   */
  const sanitizeNameForRazorpay = (name) => {
    if (!name) return 'SmartRide User'
    
    // Remove all characters except letters, spaces, hyphens, periods
    let sanitized = name
      .trim()
      .replace(/[^a-zA-Z\s\-\.]/g, '')  // Keep only letters, spaces, hyphens, periods
      .trim()
    
    // If empty after sanitization, use default
    if (!sanitized || sanitized.length === 0) {
      return 'SmartRide User'
    }
    
    // Ensure max 50 characters
    if (sanitized.length > 50) {
      sanitized = sanitized.substring(0, 50).trim()
    }
    
    return sanitized
  }

  /**
   * Sanitize patient phone number for Razorpay
   * Razorpay only accepts: 10-15 digits, no spaces or special chars
   */
  const sanitizePhoneForRazorpay = (phone) => {
    if (!phone) return '9999999999'
    
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '')
    
    // Check if it's 10 digits (for India)
    if (cleaned.length === 10) {
      return cleaned
    }
    
    // Check if it's 12 digits (country code + 10 digits, like 919999999999)
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return cleaned.substring(2)  // Remove country code
    }
    
    // If invalid, return default
    if (cleaned.length === 0 || cleaned === 'NaN') {
      return '9999999999'
    }
    
    // Otherwise return what we have (should be 10-15 digits)
    return cleaned.slice(0, 15)
  }

  /**
   * Validate and sanitize email for Razorpay
   */
  const sanitizeEmailForRazorpay = (email) => {
    if (!email || typeof email !== 'string') {
      return 'passenger@smartride.com'
    }
    
    const trimmedEmail = email.trim()
    
    // Basic email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    
    if (emailRegex.test(trimmedEmail)) {
      return trimmedEmail
    }
    
    // If invalid, use default
    return 'passenger@smartride.com'
  }

  /**
   * Clear search form and results
   */
  const clearSearch = () => {
    setSearchForm({
      source: '',
      destination: '',
      date: '',
      minPrice: '',
      maxPrice: ''
    })
    setResults([])
    setSearched(false)
    setFareEstimation(null)
    setEstimatingFare(false)
    setSeatCounts({})
  }

  return (
    <div className="dashboard-page passenger-dashboard">
      <div className={`search-animation-overlay${searching ? ' visible' : ''}`}>
        <div className="search-animation-card">
          <div className="search-animation-lottie">
            {searching && (
              <Lottie
                animationData={searchAnimation}
                loop={true}
                onLoopComplete={() => {
                  if (searching && ridesLoaded) {
                    setAnimationComplete(true)
                  }
                }}
                style={{ width: '100%', height: '100%' }}
                rendererSettings={{ preserveAspectRatio: 'xMidYMid meet' }}
              />
            )}
          </div>
          <div className="search-animation-text">
            {LOADER_MESSAGES[loaderMessageIndex]}
          </div>
        </div>
      </div>

      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Passenger Dashboard</h1>
          <p className="dashboard-sub">Find rides and manage your bookings</p>
        </div>
        <div className="dashboard-avatar">
          <Users size={20} />
          <div>
            <div className="avatar-name">{user?.name || 'Passenger'}</div>
            <div className="avatar-role">Passenger</div>
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
        {/* SEARCH */}
        {tab === 'search' && (
          <div className="dash-panel">
            <div className="panel-header">
              <Search size={20} />
              <div>
                <h2>Find a Ride</h2>
                <p>Search available rides by route and date</p>
              </div>
            </div>

            <form onSubmit={handleSearch} className="search-form">
              <div className="search-main-row">
                <div className="form-group">
                  <label className="sr-label">From</label>
                  <div className="input-wrap">
                    <MapPin size={15} className="input-icon" />
                    <input className="sr-input pl-icon" placeholder="Pickup city" value={searchForm.source} onChange={set('source')} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="sr-label">To</label>
                  <div className="input-wrap">
                    <MapPin size={15} className="input-icon" />
                    <input className="sr-input pl-icon" placeholder="Drop city" value={searchForm.destination} onChange={set('destination')} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="sr-label">Date</label>
                  <div className="input-wrap">
                    <Calendar size={15} className="input-icon" />
                    <input className="sr-input pl-icon" type="date" value={searchForm.date} onChange={set('date')} min={new Date().toISOString().split('T')[0]} />
                  </div>
                </div>
              </div>

              {fareEstimation && (
                <div className="fare-estimation-card">
                  <div className="fare-estimation-header">
                    <span className="fare-estimation-title">Estimated Fare</span>
                    {estimatingFare && <Loader size={16} className="spin" />}
                  </div>
                  <div className="fare-estimation-content">
                    <div className="fare-distance">
                      <span className="distance-label">Distance:</span>
                      <span className="distance-value">{fareEstimation.distanceKm.toFixed(0)} km</span>
                    </div>
                    <div className="fare-range">
                      <span className="fare-label">Fare Range:</span>
                      <span className="fare-value">
                        ₹{Math.round(fareEstimation.minFare || fareEstimation.estimatedFare * 0.9)} – ₹{Math.round(fareEstimation.maxFare || fareEstimation.estimatedFare * 1.1)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="search-actions">
                <button type="button" className="sr-btn sr-btn-ghost filter-btn" onClick={() => setShowFilters(!showFilters)}>
                  <Filter size={15} />
                  Price Filter
                  {(searchForm.minPrice || searchForm.maxPrice) && <span className="filter-dot" />}
                </button>
                {(results.length > 0 || searched) && (
                  <button type="button" className="sr-btn sr-btn-ghost" onClick={clearSearch}>
                    <X size={15} /> Clear
                  </button>
                )}
                <button type="submit" className="sr-btn sr-btn-primary" disabled={searching} style={{ marginLeft: 'auto' }}>
                  {searching ? <span className="spinner" /> : <Search size={15} />}
                  {searching ? 'Searching...' : 'Search Rides'}
                </button>
              </div>

              {showFilters && (
                <div className="filter-row fade-up">
                  <div className="form-group">
                    <label className="sr-label">Min Price (₹)</label>
                    <div className="input-wrap">
                      <IndianRupee size={14} className="input-icon" />
                      <input className="sr-input pl-icon" type="number" min="0" placeholder="0" value={searchForm.minPrice} onChange={set('minPrice')} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="sr-label">Max Price (₹)</label>
                    <div className="input-wrap">
                      <IndianRupee size={14} className="input-icon" />
                      <input className="sr-input pl-icon" type="number" min="0" placeholder="No limit" value={searchForm.maxPrice} onChange={set('maxPrice')} />
                    </div>
                  </div>
                  <button type="button" className="sr-btn sr-btn-ghost clear-filter" onClick={() => setSearchForm(f => ({ ...f, minPrice: '', maxPrice: '' }))}>
                    <X size={14} /> Clear
                  </button>
                </div>
              )}
            </form>

            {/* Results */}
            {searched && !searching && (
              <div className="results-section">
                <div className="results-header">
                  <span className="results-count">
                    {results && results.length > 0 ? `${results.length} ride${results.length !== 1 ? 's' : ''} found` : 'No rides found'}
                  </span>
                  {results && results.length > 0 && (
                    <span className="results-route">
                      {searchForm.source} → {searchForm.destination}
                    </span>
                  )}
                </div>

                {!results || results.length === 0 ? (
                  <div className="empty-state">
                    <Search size={36} />
                    <p>No rides available for this route and date</p>
                    <span>Try a different date or check back later</span>
                  </div>
                ) : (
                  <div className="rides-grid">
                    {results.map((ride, idx) => {
                      if (!ride || !ride.id) {
                        console.warn('Invalid ride object at index', idx, ride)
                        return null
                      }
                      
                      return (
                        <div key={ride.id} className="ride-card ride-card-result">
                          <div className="ride-route">
                            <span className="ride-city">{ride.source || 'Unknown'}</span>
                            <div className="ride-arrow-wrap">
                              <div className="ride-arrow-line" />
                              <Car size={14} className="ride-arrow-car" />
                            </div>
                            <span className="ride-city">{ride.destination || 'Unknown'}</span>
                          </div>
                          <div className="ride-meta">
                            <span><Calendar size={13} /> {ride.date || 'N/A'}</span>
                            <span><Clock size={13} /> {ride.time || 'N/A'}</span>
                            <span><Users size={13} /> {ride.availableSeats || 0} seats</span>
                            <span className="ride-price"><IndianRupee size={13} />₹{Math.round(ride.calculatedFarePerSeat || 0)} / seat · {ride.distanceKm || 0}km</span>
                          </div>
                          <div className="ride-driver">
                            <div className="driver-avatar-sm">{(ride.driverName || 'D')?.charAt(0).toUpperCase()}</div>
                            <div className="driver-info-sm">
                              <span className="driver-name">{ride.driverName || 'Driver'}</span>
                              <div className="driver-rating-container">
                                {ride.driverRating && ride.driverRating > 0 ? (
                                  <div className="driver-rating">
                                    {[1, 2, 3, 4, 5].map(star => (
                                      <span key={star}
                                        style={{ color: star <= Math.round(ride.driverRating) ? '#f59e0b' : '#d1d5db' }}>
                                        ★
                                      </span>
                                    ))}
                                    <span className="rating-value">
                                      {ride.driverRating}
                                    </span>
                                    <span className="rating-count">
                                      ({ride.driverReviewCount})
                                    </span>
                                  </div>
                                ) : (
                                  <div className="no-rating">
                                    {[1, 2, 3, 4, 5].map(star => (
                                      <span key={star} style={{ color: '#d1d5db' }}>
                                        ★
                                      </span>
                                    ))}
                                    <span style={{ marginLeft: '4px', color: '#6b7280', fontSize: '12px' }}>No ratings yet</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="ride-book-row">
                            <div className="seat-select">
                              <label className="sr-label" style={{ margin: 0 }}>Seats</label>
                              <select
                                className="sr-input"
                                style={{ width: 70, padding: '8px 10px' }}
                                value={seatCounts[ride.id] || 1}
                                onChange={e => setSeatCounts(p => ({ ...p, [ride.id]: parseInt(e.target.value) }))}
                              >
                                {Array.from({ length: Math.max(1, ride.availableSeats || 1) }, (_, i) => i + 1).map(n => (
                                  <option key={n} value={n}>{n}</option>
                                ))}
                              </select>
                            </div>
                            <div className="ride-total">
                              {(seatCounts[ride.id] || 1)} seat{(seatCounts[ride.id] || 1) > 1 ? 's' : ''} × ₹{Math.round(ride.calculatedFarePerSeat || 0)} = <strong>₹{(((seatCounts[ride.id] || 1) * (ride.calculatedFarePerSeat || 0)).toFixed(0))}</strong>
                            </div>
                            <button
                              className="sr-btn sr-btn-primary"
                              disabled={bookingId === ride.id || (ride.availableSeats || 0) === 0 || paymentInProgress || !razorpayLoaded}
                              onClick={() => handleBook(ride.id)}
                            >
                              {bookingId === ride.id ? <><span className="spinner" /> Booking...</> : 
                               paymentInProgress ? 'Payment in Progress...' : 
                               !razorpayLoaded ? 'Loading Payment...' : 'Book Now'}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* MY BOOKINGS */}
        {tab === 'bookings' && (
          <div className="dash-panel">
            <div className="panel-header">
              <List size={20} />
              <div>
                <h2>My Bookings</h2>
                <p>All your ride bookings and their status</p>
              </div>
            </div>
            {dataLoading ? (
              <div className="loading-state"><Loader size={24} className="spin" /> Loading bookings...</div>
            ) : bookings.length === 0 ? (
              <div className="empty-state">
                <List size={40} />
                <p>No bookings yet</p>
                <button className="sr-btn sr-btn-primary" onClick={() => setTab('search')}>
                  <Search size={15} /> Find a ride
                </button>
              </div>
            ) : (
              <div className="my-bookings-list">
                {bookings.map(b => {
                  const rideStatus = rideStatuses[b.rideId]
                  return (
                  <div key={b.bookingId} className={`booking-card ${b.status === 'CANCELLED' ? 'cancelled' : ''}`}>
                    <div className="booking-status-bar">
                      <span 
                        className="badge" 
                        style={{ 
                          backgroundColor: STATUS_COLORS[b.rideStatus] || BOOKING_STATUS_COLORS[b.status] || '#64748b',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          color: 'white',
                          padding: '4px 10px',
                          borderRadius: '100px',
                          fontSize: '11px',
                          fontWeight: '700',
                          textTransform: 'uppercase'
                        }}
                      >
                        {b.rideStatus === 'RIDE_COMPLETED' || b.status === 'COMPLETED' ? (
                          <CheckCircle size={11} />
                        ) : b.status === 'CANCELLED' || b.rideStatus === 'CANCELLED' ? (
                          <XCircle size={11} />
                        ) : (
                          <Clock size={11} />
                        )}
                        {(b.rideStatus || b.status)?.replace(/_/g, ' ')}
                      </span>
                      <div className="booking-top-right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span className="booking-id">#{b.bookingId}</span>
                        {(b.status === 'CONFIRMED' || b.status === 'PAID') && b.rideStatus !== 'RIDE_COMPLETED' && b.status !== 'CANCELLED' && b.rideStatus !== 'CANCELLED' && (
                          <button
                            className="sr-btn sr-btn-danger"
                            style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '6px', minWidth: 'auto' }}
                            onClick={() => handleCancel(b.bookingId)}
                            disabled={cancelling === b.bookingId}
                            title="Cancel Booking"
                          >
                            {cancelling === b.bookingId ? <><Loader size={12} className="spin" /> Wait...</> : <><XCircle size={12} /> Cancel</>}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Real-time Ride Status Update */}
                    {rideStatus && (
                      <div className="ride-status-update">
                        <span className="status-indicator">🚗</span>
                        <span className="status-text">{rideStatus.message}</span>
                      </div>
                    )}

                    <div className="booking-route">
                      <div className="booking-city">
                        <div className="route-dot route-dot-start" />
                        <span>{b.source}</span>
                      </div>
                      <div className="booking-route-line" />
                      <div className="booking-city">
                        <div className="route-dot route-dot-end" />
                        <span>{b.destination}</span>
                      </div>
                    </div>
                    <div className="booking-meta">
                      <span><Calendar size={13} /> {b.date}</span>
                      <span><Clock size={13} /> {b.time}</span>
                      <span><Users size={13} /> {b.seatCount} seat{b.seatCount > 1 ? 's' : ''}</span>
                      <span><Car size={13} /> {b.driverName}</span>
                      {b.totalFare > 0 && (
                        <span style={{ fontWeight: 700, color: 'var(--green, #22c55e)' }}>
                          <IndianRupee size={13} />
                          {b.farePerSeat > 0
                            ? `₹${Math.round(b.farePerSeat)} × ${b.seatCount} = ₹${Math.round(b.totalFare)}`
                            : `₹${Math.round(b.totalFare)} total`}
                        </span>
                      )}
                    </div>
                    <div className="booking-actions">
                      {/* Cancel button moved to top right */}
                      {(b.status === 'COMPLETED' || b.status === 'RIDE_COMPLETED' || b.rideStatus === 'RIDE_COMPLETED') && (
                        <>
                          {reviewStatuses[b.bookingId] ? (
                            <span className="reviewed-badge">✓ Reviewed</span>
                          ) : (
                            <button
                              className="review-rate-btn"
                              onClick={() => setReviewModalBooking(b)}
                            >
                              ⭐ Rate Your Ride
                            </button>
                          )}
                          <button
                            className="delete-btn-icon"
                            onClick={() => handleDeleteRide(b.rideId, b.bookingId)}
                            disabled={deleting === b.bookingId}
                            title="Delete ride"
                          >
                            {deleting === b.bookingId ? <Loader size={16} className="spin" /> : <Trash2 size={16} className="trash-icon" />}
                          </button>
                        </>
                      )}
                      {(b.status === 'COMPLETED' || b.status === 'RIDE_COMPLETED' || b.rideStatus === 'RIDE_COMPLETED' || b.status === 'CANCELLED') && (
                        <div style={{ marginLeft: 'auto' }}>
                          {disputeStatuses[b.bookingId] ? (
                            <span className="dispute-raised-badge">🚨 Dispute Raised ✓</span>
                          ) : (
                            <button
                              className="sr-btn sr-btn-ghost cancel-btn"
                              style={{ padding: '6px 10px', fontSize: '12px' }}
                              onClick={() => setDisputeModalBooking(b)}
                            >
                              🚨 Raise Dispute
                            </button>
                          )}
                        </div>
                      )}
                      {b.status === 'CANCELLED' && (
                        <button
                          className="delete-btn-icon"
                          onClick={() => handleDelete(b.bookingId)}
                          disabled={deleting === b.bookingId}
                          title="Delete booking"
                        >
                          {deleting === b.bookingId ? <Loader size={16} className="spin" /> : <Trash2 size={16} className="trash-icon" />}
                        </button>
                      )}
                    </div>
                  </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {reviewModalBooking && (
        <ReviewModal
          booking={reviewModalBooking}
          revieweeName={reviewModalBooking.driverName}
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
    </div>
  )
}
