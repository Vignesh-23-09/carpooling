import axios from 'axios'

// Backend API endpoint
const BASE = 'http://localhost:8080/api'

const api = axios.create({
  baseURL: BASE,
  withCredentials: true,
})

// Inject JWT token on every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('sr_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle response errors globally
api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', {
      status: error.response?.status,
      data:   error.response?.data,
      url:    error.config?.url,
      message: error.message,
    })
    // If JWT is expired / invalid, clear local auth and redirect
    if (error.response?.status === 401) {
      const publicPaths = ['/login', '/register', '/verify-otp', '/']
      if (!publicPaths.includes(window.location.pathname)) {
        localStorage.removeItem('sr_token')
        localStorage.removeItem('sr_role')
        localStorage.removeItem('sr_user')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  register:  (data) => api.post('/auth/register', data),
  verifyOtp: (data) => api.post('/auth/verify-otp', data),
  login:     (data) => api.post('/auth/login', data),
}

// ── Passenger ─────────────────────────────────────────────────────────────────
export const passengerAPI = {
  searchRides:   (data) => api.post('/passenger/search', data),
  // payload for booking includes optional sourceCity and destinationCity
  // fields so that the backend can recompute the same distance that was
  // shown on the ride card.  These values come from the user's search form.
  bookRide:      (data) => api.post('/passenger/book', data),
  confirmBooking: (bookingId) => api.post(`/passenger/confirm/${bookingId}`),
  myBookings:    ()     => api.get('/passenger/my-bookings'),
  cancelBooking: (id)   => api.put(`/passenger/cancel/${id}`),
  deleteBooking: (id)   => api.delete(`/passenger/delete/${id}`),
  deleteRide:    (id)   => api.delete(`/passenger/delete-ride/${id}`),
}

// ── Payments ──────────────────────────────────────────────────────────────────
export const paymentAPI = {
  createOrder:  (bookingId) => api.post(`/payment/create-order?bookingId=${bookingId}`),
  verifyPayment: (data)     => api.post('/payment/verify', data),
}

// ── Fare Estimation ─────────────────────────────────────────────────────────────
export const fareAPI = {
  estimateFare: (data) => api.post('/fare/estimation', data),
  estimateFareByCities: (data) => api.post('/fare/estimate-cities', data),
}

// ── Driver ────────────────────────────────────────────────────────────────────
export const driverAPI = {
  postRide: (data) => api.post('/driver/post-ride', data),
  myRides:  ()     => api.get('/driver/my-rides'),
  bookings: ()     => api.get('/driver/bookings'),
  acceptRide: (rideId) => api.post(`/driver/accept-ride/${rideId}`),
  startRide: (rideId) => api.post(`/driver/start-ride/${rideId}`),
  completeRide: (rideId) => api.post(`/driver/complete-ride/${rideId}`),
  cancelRide: (rideId, reason) => api.post(`/driver/cancel-ride/${rideId}?reason=${encodeURIComponent(reason)}`),
  deleteRide: (rideId) => api.delete(`/driver/delete-ride/${rideId}`),
}

// ── Driver Earnings ───────────────────────────────────────────────────────────
export const driverEarningsAPI = {
  getSummary: () => api.get('/driver/earnings/summary'),
  getMonthly: () => api.get('/driver/earnings/monthly'),
  getTransactions: () => api.get('/driver/earnings/transactions')
}

// ── Notifications ─────────────────────────────────────────────────────────────
export const notificationAPI = {
  getNotifications: () => api.get('/notifications'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (notificationId) => api.put(`/notifications/${notificationId}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
}

// ── Reviews ───────────────────────────────────────────────────────────────────
export const reviewAPI = {
  submitReview: (data) => api.post('/reviews/submit', data),
  getReviewsForUser: (userId) => api.get(`/reviews/user/${userId}`),
  getAverageRating: (userId) => api.get(`/reviews/average/${userId}`),
  hasReviewed: (bookingId) => api.get(`/reviews/check/${bookingId}`),
}

// ── Admin ────────────────────────────────────────────────────────────────────
export const adminAPI = {
  getStats:               ()    => api.get('/admin/stats'),
  getAllUsers:             ()    => api.get('/admin/users'),
  getUserById:            (id)  => api.get(`/admin/users/${id}`),
  blockUser:              (id)  => api.put(`/admin/users/${id}/block`),
  unblockUser:            (id)  => api.put(`/admin/users/${id}/unblock`),
  verifyDriver:           (id)  => api.put(`/admin/users/${id}/verify-driver`),
  getAllRides:             ()    => api.get('/admin/rides'),
  getRideById:            (id)  => api.get(`/admin/rides/${id}`),
  getAllBookings:          ()    => api.get('/admin/bookings'),
  getAllPayments:          ()    => api.get('/admin/payments'),
  getEarningsReport:      ()    => api.get('/admin/reports/earnings'),
  getRidesReport:         ()    => api.get('/admin/reports/rides'),
  getCancellationsReport: ()    => api.get('/admin/reports/cancellations'),
}

// ── Disputes ─────────────────────────────────────────────────────────────────
export const disputeAPI = {
  raiseDispute:    (data) => api.post('/disputes/raise', data),
  getMyDisputes:   ()     => api.get('/disputes/my'),
  getAllDisputes:  ()     => api.get('/disputes/admin/all'),
  getOpenDisputes: ()     => api.get('/disputes/admin/open'),
  markUnderReview: (id)   => api.put(`/disputes/admin/${id}/review`),
  resolveDispute:  (id, note) => api.put(`/disputes/admin/${id}/resolve`, { adminNote: note }),
  rejectDispute:   (id, note) => api.put(`/disputes/admin/${id}/reject`, { adminNote: note }),
}

export default api
