import { useState, useEffect } from 'react'
import { Bell, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import WebSocketService from '../services/WebSocketService'
import './NotificationDropdown.css'

export default function NotificationDropdown() {
  const { isAuthenticated, user, token } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [wsConnected, setWsConnected] = useState(false)

  // WebSocket subscription for real-time notifications
  useEffect(() => {
    if (!isAuthenticated || !user?.id || !token) {
      console.log('[NotificationDropdown] Skipping WebSocket subscription - user not authenticated or no ID/token')
      return
    }

    console.log('[NotificationDropdown] Subscribing to WebSocket notifications for user:', user.id)
    
    // Subscribe to new notifications
    WebSocketService.subscribeToNotifications(user.id, (notification) => {
      console.log('[NotificationDropdown] Received new notification via WebSocket:', notification)
      setNotifications((prev) => [notification, ...prev])
      setUnreadCount((prev) => prev + 1)
    })

    // Subscribe to unread count updates
    WebSocketService.subscribeToUnreadCount(user.id, (count) => {
      console.log('[NotificationDropdown] Received unread count via WebSocket:', count)
      setUnreadCount(count)
    })

    setWsConnected(true)

    return () => {
      console.log('[NotificationDropdown] Cleaning up WebSocket subscriptions')
    }
  }, [isAuthenticated, user?.id, token])

  // Poll unread count every 60 seconds (fallback)
  useEffect(() => {
    if (!isAuthenticated || !token) return

    const fetchUnreadCount = async () => {
      try {
        const { data } = await api.get('/notifications/unread-count')
        console.log('[NotificationDropdown] Unread count fetched (polling):', data)
        setUnreadCount(data)
      } catch (error) {
        console.error('[NotificationDropdown] Failed to fetch unread count:', error.response?.data || error.message)
      }
    }

    // Fetch immediately on mount
    fetchUnreadCount()
    
    // Then poll every 60 seconds (fallback if WebSocket fails)
    const interval = setInterval(fetchUnreadCount, 60000)
    return () => clearInterval(interval)
  }, [isAuthenticated])

  const fetchNotifications = async () => {
    if (!isAuthenticated || !token) {
      console.warn('[NotificationDropdown] User not authenticated')
      return
    }

    setLoading(true)
    try {
      console.log('[NotificationDropdown] Fetching notifications...')
      const { data } = await api.get('/notifications')
      console.log('[NotificationDropdown] Notifications fetched:', data)
      setNotifications(data)
      
      // Mark all as read when dropdown opens
      await api.put('/notifications/read-all')
      console.log('[NotificationDropdown] All marked as read')
      setUnreadCount(0)
    } catch (error) {
      console.error('[NotificationDropdown] Failed to fetch notifications:', error.response?.data || error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleBellClick = () => {
    console.log('[NotificationDropdown] Bell icon clicked, isOpen:', isOpen, 'wsConnected:', wsConnected)
    if (!isOpen) {
      fetchNotifications()
    }
    setIsOpen(!isOpen)
  }

  const handleClose = () => {
    console.log('[NotificationDropdown] Closing dropdown')
    setIsOpen(false)
  }

  const getTypeLabel = (type) => {
    const labels = {
      BOOKING_CONFIRMED: 'Booking Confirmed',
      RIDE_REMINDER: 'Ride Reminder',
      RIDE_CANCELLED: 'Ride Cancelled',
      RIDE_RESCHEDULED: 'Ride Rescheduled',
      DRIVER_NEW_BOOKING: 'New Booking',
      DRIVER_BOOKING_CANCELLED: 'Booking Cancelled',
      PASSENGER_BOOKING_CANCELLED: 'Booking Cancelled',
      DISPUTE_RAISED: 'Dispute Raised',
      DISPUTE_UNDER_REVIEW: 'Under Review',
      DISPUTE_RESOLVED: 'Dispute Resolved',
      DISPUTE_REJECTED: 'Dispute Rejected'
    }
    return labels[type] || type
  }

  const getTypeColor = (type) => {
    const colors = {
      BOOKING_CONFIRMED: 'notification-type-confirmed',
      RIDE_REMINDER: 'notification-type-reminder',
      RIDE_CANCELLED: 'notification-type-cancelled',
      RIDE_RESCHEDULED: 'notification-type-rescheduled',
      DRIVER_NEW_BOOKING: 'notification-type-driver-new',
      DRIVER_BOOKING_CANCELLED: 'notification-type-driver-cancelled',
      PASSENGER_BOOKING_CANCELLED: 'notification-type-passenger-cancelled',
      DISPUTE_RAISED: 'notification-type-dispute-raised',
      DISPUTE_UNDER_REVIEW: 'notification-type-dispute-review',
      DISPUTE_RESOLVED: 'notification-type-dispute-resolved',
      DISPUTE_REJECTED: 'notification-type-dispute-rejected'
    }
    return colors[type] || ''
  }

  const formatTimeAgo = (createdAt) => {
    const date = new Date(createdAt)
    const now = new Date()
    const seconds = Math.floor((now - date) / 1000)

    if (seconds < 60) return 'Just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  if (!isAuthenticated) return null

  return (
    <div className="notification-dropdown-container">
      <button className="notification-bell" onClick={handleBellClick} title="Notifications">
        <Bell size={18} />
        {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            <button className="close-btn" onClick={handleClose}>
              <X size={18} />
            </button>
          </div>

          <div className="notification-list">
            {loading ? (
              <div className="notification-loading">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="notification-empty">No notifications</div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`notification-item ${notif.isRead ? '' : 'unread'}`}
                >
                  <div className={`notification-type-badge ${getTypeColor(notif.type)}`}>
                    {getTypeLabel(notif.type).charAt(0)}
                  </div>
                  <div className="notification-content">
                    <p className="notification-message">{notif.message}</p>
                    <span className="notification-time">{formatTimeAgo(notif.createdAt)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
