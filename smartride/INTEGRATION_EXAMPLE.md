# Integration Example: Complete Passenger Ride Flow

This example demonstrates how all Milestone 2 components work together for a complete passenger ride booking and payment flow.

## Complete Passenger Journey

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PaymentModal from './PaymentModal';
import RouteMatching from './RouteMatching';
import TransactionHistory from './TransactionHistory';
import WebSocketService from './WebSocketService';

const PassengerDashboard = () => {
  // State management
  const [searchParams, setSearchParams] = useState({
    source: '',
    destination: '',
    date: '',
  });
  const [selectedRide, setSelectedRide] = useState(null);
  const [bookingData, setBookingData] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [activeTab, setActiveTab] = useState('search'); // search, book, history
  const [notifications, setNotifications] = useState([]);
  const API_BASE_URL = 'http://localhost:8080';
  const token = localStorage.getItem('jwtToken');
  const userId = localStorage.getItem('userId');

  // Initialize WebSocket connection
  useEffect(() => {
    WebSocketService.connect(
      () => {
        console.log('✓ WebSocket connected');
        // Subscribe to ride notifications
        if (userId) {
          WebSocketService.subscribeToPassengerRides(userId, handleRideNotification);
        }
      },
      (error) => {
        console.error('WebSocket error:', error);
      }
    );

    // Listen to connection events
    WebSocketService.on('connected', () => {
      console.log('✓ Connected to real-time updates');
    });

    return () => {
      WebSocketService.disconnect();
    };
  }, [userId]);

  // Handle search parameter changes
  const handleSearchChange = (e) => {
    const { name, value } = e.target;
    setSearchParams((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Step 1: Select a ride from route matching results
  const handleSelectRide = async (ride) => {
    console.log('💼 Selected Ride:', ride);
    setSelectedRide(ride);
    setActiveTab('book');
  };

  // Step 2: Book the ride and proceed to payment
  const handleBookRide = async () => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/passenger/book-ride`,
        {
          rideId: selectedRide.rideId,
          seatCount: 1,
          sourceCity: searchParams.source,
          destinationCity: searchParams.destination,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log('✓ Booking created:', response.data);
      
      // Extract booking ID from response
      // Expected format: "Booking #123 created! Please complete payment to confirm."
      const bookingId = extractBookingId(response.data);
      
      setBookingData({
        bookingId,
        rideId: selectedRide.rideId,
        totalFare: selectedRide.estimatedFare,
        driverName: selectedRide.driverName,
      });

      // Show payment modal
      setShowPaymentModal(true);
    } catch (error) {
      console.error('✗ Booking failed:', error);
      alert('Failed to create booking: ' + (error.response?.data?.message || error.message));
    }
  };

  // Step 3: Handle successful payment
  const handlePaymentSuccess = async (paymentId) => {
    try {
      // Confirm booking after payment
      const response = await axios.post(
        `${API_BASE_URL}/api/passenger/confirm-booking/${bookingData.bookingId}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log('✓ Booking confirmed:', response.data);
      alert('✓ Booking confirmed! Your ride is on the way.');
      
      // Reset state
      setShowPaymentModal(false);
      setSelectedRide(null);
      setBookingData(null);
      setActiveTab('history');
    } catch (error) {
      console.error('✗ Booking confirmation failed:', error);
      alert('Failed to confirm booking');
    }
  };

  // Handle real-time ride notifications
  const handleRideNotification = (message) => {
    console.log('📢 Notification received:', message);
    
    // Add to notifications list
    setNotifications((prev) => [
      ...prev,
      {
        id: Date.now(),
        status: message.status,
        message: message.message,
        timestamp: new Date(),
        driverName: message.driverName,
        latitude: message.latitude,
        longitude: message.longitude,
      },
    ]);

    // Show toast or alert
    switch (message.status) {
      case 'DRIVER_ASSIGNED':
        showNotification(
          `${message.message}`,
          `Driver: ${message.driverName}, Car: ${message.carModel}`
        );
        break;
      case 'DRIVER_ARRIVING':
        const eta = message.etaSeconds ? `${Math.round(message.etaSeconds / 60)} min` : 'Soon';
        showNotification(`Driver arriving`, `ETA: ${eta}`);
        break;
      case 'RIDE_STARTED':
        showNotification('Ride Started', 'Your journey has begun!');
        break;
      case 'RIDE_COMPLETED':
        showNotification(
          'Ride Completed',
          `Distance: ${message.distanceKm}km, Fare: ₹${message.totalFare}`
        );
        break;
      case 'RIDE_CANCELLED':
        showNotification('Ride Cancelled', message.message, 'error');
        break;
      default:
        showNotification('Update', message.message);
    }
  };

  // Utility function to show notifications
  const showNotification = (title, message, type = 'info') => {
    const notification = {
      title,
      message,
      type,
    };
    console.log('🔔', notification);
    // In a real app, use a toast library like react-toastify
  };

  // Extract booking ID from response message
  const extractBookingId = (message) => {
    const match = message.match(/#(\d+)/);
    return match ? parseInt(match[1]) : null;
  };

  return (
    <div className="passenger-dashboard">
      <header className="dashboard-header">
        <h1>🚗 SmartRide - Passenger Dashboard</h1>
        <div className="connection-status">
          {WebSocketService.isConnected ? (
            <span className="status online">🟢 Online</span>
          ) : (
            <span className="status offline">🔴 Offline</span>
          )}
        </div>
      </header>

      <div className="dashboard-tabs">
        <button
          className={`tab ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          🔍 Find Ride
        </button>
        <button
          className={`tab ${activeTab === 'book' ? 'active' : ''}`}
          onClick={() => setActiveTab('book')}
        >
          📋 Booking
        </button>
        <button
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📊 History
        </button>
      </div>

      <div className="dashboard-content">
        {/* TAB 1: Search & Route Matching */}
        {activeTab === 'search' && (
          <div className="search-tab">
            <div className="search-form">
              <input
                type="text"
                name="source"
                placeholder="Enter source city"
                value={searchParams.source}
                onChange={handleSearchChange}
              />
              <input
                type="text"
                name="destination"
                placeholder="Enter destination city"
                value={searchParams.destination}
                onChange={handleSearchChange}
              />
              <input
                type="date"
                name="date"
                value={searchParams.date}
                onChange={handleSearchChange}
              />
            </div>

            {searchParams.source && searchParams.destination && searchParams.date && (
              <RouteMatching
                source={searchParams.source}
                destination={searchParams.destination}
                date={searchParams.date}
                onSelectRide={handleSelectRide}
              />
            )}
          </div>
        )}

        {/* TAB 2: Booking Confirmation */}
        {activeTab === 'book' && selectedRide && (
          <div className="booking-tab">
            <div className="booking-summary">
              <h2>Booking Summary</h2>
              <div className="summary-details">
                <div className="detail">
                  <span>Driver:</span>
                  <strong>{selectedRide.driverName}</strong>
                </div>
                <div className="detail">
                  <span>Vehicle:</span>
                  <strong>{selectedRide.carModel}</strong>
                </div>
                <div className="detail">
                  <span>Route:</span>
                  <strong>
                    {selectedRide.source} → {selectedRide.destination}
                  </strong>
                </div>
                <div className="detail">
                  <span>Distance:</span>
                  <strong>{selectedRide.distanceKm?.toFixed(1)} km</strong>
                </div>
                <div className="detail">
                  <span>Match Quality:</span>
                  <strong className="quality">
                    {selectedRide.matchQuality}/10
                  </strong>
                </div>
                <div className="detail total">
                  <span>Estimated Fare:</span>
                  <strong>₹{selectedRide.estimatedFare?.toFixed(2)}</strong>
                </div>
              </div>

              <button
                className="btn-confirm-booking"
                onClick={handleBookRide}
              >
                Proceed to Payment
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: Transaction History */}
        {activeTab === 'history' && <TransactionHistory />}
      </div>

      {/* Real-time Notifications */}
      <div className="notifications">
        {notifications.map((notif, index) => (
          <div
            key={notif.id}
            className={`notification ${notif.status.toLowerCase()}`}
          >
            <div className="notification-content">
              <strong>{notif.message}</strong>
              <small>{notif.timestamp.toLocaleTimeString()}</small>
            </div>
            <button
              className="close-notification"
              onClick={() =>
                setNotifications((prev) =>
                  prev.filter((n) => n.id !== notif.id)
                )
              }
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && bookingData && (
        <PaymentModal
          bookingId={bookingData.bookingId}
          totalFare={bookingData.totalFare}
          passengerName={localStorage.getItem('userName')}
          onPaymentSuccess={handlePaymentSuccess}
          onClose={() => setShowPaymentModal(false)}
        />
      )}
    </div>
  );
};

export default PassengerDashboard;
```

## Complete Driver Booking Flow

```javascript
// Driver receives bookings via WebSocket

// 1. Driver connects and subscribes to notifications
WebSocketService.subscribeToDriverBookings(driverId, (notification) => {
  if (notification.status === 'NEW_BOOKING') {
    // Display booking notification
    console.log(`New booking from ${notification.passengerName}`);
    console.log(`Pickup: ${notification.pickupLocation}`);
    console.log(`Dropoff: ${notification.dropoffLocation}`);
    
    // Show popup/alert
    displayBookingAlert(notification);
  }
});

// 2. Driver accepts booking
async function acceptBooking(bookingId) {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/driver/accept-booking/${bookingId}`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('✓ Booking accepted');
    
    // Notify passenger via WebSocket
    WebSocketService.send('/app/driver/accept', {
      bookingId,
      driverId,
      message: 'Driver accepted your booking',
    });
  } catch (error) {
    console.error('Failed to accept booking:', error);
  }
}

// 3. Driver sends live location updates
function startLocationTracking(passengerId, bookingId) {
  const watchId = navigator.geolocation.watchPosition((position) => {
    const { latitude, longitude } = position.coords;
    
    // Send location to server via WebSocket
    WebSocketService.send('/app/driver/location', {
      passengerId,
      bookingId,
      latitude,
      longitude,
      timestamp: new Date(),
    });
  });
  
  return watchId;
}

// 4. Driver completes ride
async function completeRide(bookingId, totalFare, distanceKm, durationMinutes) {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/driver/complete-ride/${bookingId}`,
      { totalFare, distanceKm, durationMinutes },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('✓ Ride completed');
    
    // Send completion notification
    WebSocketService.send('/app/driver/complete', {
      bookingId,
      message: 'Ride completed',
    });
  } catch (error) {
    console.error('Failed to complete ride:', error);
  }
}
```

## Key Integration Points

### 1. Search → Booking → Payment Flow
```
Search for routes
    ↓
Display smart matches (RouteMatching component)
    ↓
Select best ride
    ↓
Book ride (POST /api/passenger/book-ride)
    ↓
Show payment modal (PaymentModal component)
    ↓
Process payment (Razorpay)
    ↓
Confirm booking (POST /api/passenger/confirm-booking)
    ↓
WebSocket notifies driver
    ↓
Driver accepts job
    ↓
Passenger receives real-time updates
```

### 2. Real-time Updates Flow
```
Payment verified
    ↓
Backend creates transaction
    ↓
Backend sends WebSocket notification to driver
    ↓
Driver WebSocket listener receives notification
    ↓
Driver's notification panel updates
    ↓
Driver accepts or declines
    ↓
Backend sends confirmation to passenger
    ↓
Passenger WebSocket listener receives update
    ↓
Passenger dashboard shows driver info
```

### 3. Receipt & History Flow
```
Ride completed
    ↓
Transaction saved to DB
    ↓
Passenger views history tab
    ↓
TransactionHistory component loads receipts
    ↓
Passenger can view or download receipt
    ↓
Receipt includes all ride details and fare breakdown
```

## Error Handling Guide

```javascript
// Payment errors
try {
  // Payment flow
} catch (error) {
  if (error.response?.status === 401) {
    // Authorization error - redirect to login
  } else if (error.response?.status === 404) {
    // Booking not found
  } else if (error.response?.status === 500) {
    // Server error - retry
  }
}

// WebSocket errors
WebSocketService.on('connection_failed', () => {
  // Show offline message
  // Provide option to retry
});

// Route matching errors
if (matches.length === 0) {
  // No rides found - suggest different parameters
}
```

---

*This integration example shows how all Milestone 2 components work together to create a complete ride-sharing experience.*
