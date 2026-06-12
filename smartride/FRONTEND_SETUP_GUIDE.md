# Frontend Components Setup Guide

This guide explains how to set up and integrate the Milestone 2 frontend components in your React application.

## Installation

### 1. Install Dependencies

```bash
npm install axios sockjs-client stompjs
```

### 2. Copy Components

Copy all component files from `smartride-frontend-components/` to your project:
- `PaymentModal.jsx` → `src/components/`
- `RouteMatching.jsx` → `src/components/`
- `TransactionHistory.jsx` → `src/components/`
- `WebSocketService.js` → `src/services/`
- CSS files → `src/components/`

### 3. Update Public HTML

Add Razorpay script to `public/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>SmartRide</title>
  </head>
  <body>
    <div id="root"></div>
    <!-- Razorpay Checkout Script -->
    <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  </body>
</html>
```

## Component Usage

### 1. Payment Modal

**When to use:** After booking a ride, before confirming payment

```jsx
import PaymentModal from './components/PaymentModal';

function BookingPage() {
  const [showPayment, setShowPayment] = useState(false);
  const [bookingId, setBookingId] = useState(null);

  return (
    <>
      <button onClick={() => {
        setBookingId(123);
        setShowPayment(true);
      }}>
        Proceed to Payment
      </button>

      {showPayment && (
        <PaymentModal
          bookingId={bookingId}
          totalFare={450.00}
          passengerName="John Doe"
          onPaymentSuccess={(paymentId) => {
            console.log('Payment successful:', paymentId);
            // Confirm booking on backend
          }}
          onClose={() => setShowPayment(false)}
        />
      )}
    </>
  );
}
```

### 2. Route Matching

**When to use:** After searching for rides

```jsx
import RouteMatching from './components/RouteMatching';

function SearchPage() {
  return (
    <RouteMatching
      source="Bangalore"
      destination="Pune"
      date="2024-03-15"
      onSelectRide={(ride) => {
        console.log('Selected ride:', ride);
        // Proceed to booking
      }}
    />
  );
}
```

### 3. Transaction History

**When to use:** In a history or profile section

```jsx
import TransactionHistory from './components/TransactionHistory';

function HistoryPage() {
  return <TransactionHistory />;
}
```

### 4. WebSocket Service

**When to use:** For real-time updates

```jsx
import WebSocketService from './services/WebSocketService';

useEffect(() => {
  // Connect to WebSocket
  WebSocketService.connect(
    () => {
      console.log('Connected');
      // Subscribe to passenger rides
      WebSocketService.subscribeToPassengerRides(
        userId,
        (message) => {
          console.log('Ride update:', message);
          // Update UI with notification
        }
      );
    },
    (error) => {
      console.error('Connection error:', error);
    }
  );

  // Cleanup on unmount
  return () => {
    WebSocketService.disconnect();
  };
}, [userId]);
```

## Environment Variables

Create `.env` file in your project root:

```env
REACT_APP_API_URL=http://localhost:8080
REACT_APP_WS_URL=ws://localhost:8080/ws
REACT_APP_RAZORPAY_KEY=rzp_test_SN7sEcagRzBQAG
```

## Integration with Existing App

### 1. Update Your Booking Component

```jsx
import React, { useState } from 'react';
import PaymentModal from './components/PaymentModal';
import axios from 'axios';

function BookRideFlow() {
  const [selectedRide, setSelectedRide] = useState(null);
  const [bookingCreated, setBookingCreated] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('jwtToken');

  const handleBookRide = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/passenger/book-ride`,
        {
          rideId: selectedRide.rideId,
          seatCount: 1,
          sourceCity: 'Bangalore',
          destinationCity: 'Pune',
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Extract booking ID from response
      const match = response.data.match(/#(\d+)/);
      const bookingId = match ? parseInt(match[1]) : null;

      setBookingCreated({
        id: bookingId,
        totalFare: selectedRide.estimatedFare,
      });

      setShowPayment(true);
    } catch (error) {
      alert('Booking failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (paymentId) => {
    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/passenger/confirm-booking/${bookingCreated.id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Booking confirmed!');
      // Navigate to ride tracking page
    } catch (error) {
      alert('Confirmation failed: ' + error.message);
    }
  };

  return (
    <div>
      {/* Your ride selection UI */}
      <button onClick={handleBookRide} disabled={loading}>
        {loading ? 'Booking...' : 'Book Ride'}
      </button>

      {showPayment && bookingCreated && (
        <PaymentModal
          bookingId={bookingCreated.id}
          totalFare={bookingCreated.totalFare}
          passengerName={localStorage.getItem('userName')}
          onPaymentSuccess={handlePaymentSuccess}
          onClose={() => setShowPayment(false)}
        />
      )}
    </div>
  );
}

export default BookRideFlow;
```

### 2. Add Navigation

```jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import TransactionHistory from './components/TransactionHistory';
import PassengerDashboard from './pages/PassengerDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/dashboard" element={<PassengerDashboard />} />
        <Route path="/history" element={<TransactionHistory />} />
      </Routes>
    </Router>
  );
}
```

## Styling Customization

All CSS files use CSS variables for easy theming:

```css
/* Override in your app's global CSS */
:root {
  --primary-color: #3399cc;
  --success-color: #27ae60;
  --warning-color: #f39c12;
  --danger-color: #e74c3c;
  --border-radius: 8px;
}
```

## Troubleshooting

### Issue: "Razorpay is not defined"
**Solution:** Make sure Razorpay script is loaded in `public/index.html`

```html
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

### Issue: WebSocket Connection Refused
**Solution:** Ensure backend WebSocket is running on `localhost:8080/ws`

```javascript
// Check WebSocket status
console.log(WebSocketService.getStatus());
```

### Issue: CORS Error
**Solution:** Update backend `WebSocketConfig.js` with frontend URL:

```java
registry.addEndpoint("/ws")
        .setAllowedOrigins("http://localhost:3000", "http://localhost:5173")
        .withSockJS();
```

### Issue: Payment Modal Not Showing
**Solution:** Check that:
1. Booking ID is valid
2. Total fare is a number
3. localStorage has 'userEmail' set

```javascript
console.log('Booking ID:', bookingId);
console.log('Total Fare:', totalFare);
console.log('User Email:', localStorage.getItem('userEmail'));
```

## Performance Tips

1. **Lazy Load Components:**
```jsx
const PaymentModal = React.lazy(() => import('./components/PaymentModal'));
```

2. **Memoize Components:**
```jsx
export default React.memo(RouteMatching);
```

3. **Debounce Search:**
```jsx
const [searchValue, setSearchValue] = useState('');
const debouncedSearch = useCallback(
  debounce((value) => {
    // Perform search
  }, 300),
  []
);
```

4. **Cache API Responses:**
```jsx
const cache = new Map();

const fetchRides = async (params) => {
  const key = JSON.stringify(params);
  if (cache.has(key)) {
    return cache.get(key);
  }
  const data = await axios.get('...', { params });
  cache.set(key, data);
  return data;
};
```

## Testing

### Unit Tests Example

```javascript
import { render, screen } from '@testing-library/react';
import PaymentModal from './components/PaymentModal';

test('displays payment summary', () => {
  render(
    <PaymentModal
      bookingId={123}
      totalFare={450}
      passengerName="John"
    />
  );
  expect(screen.getByText(/Complete Payment/i)).toBeInTheDocument();
  expect(screen.getByText('₹450.00')).toBeInTheDocument();
});
```

### E2E Tests Example

```javascript
describe('Complete Payment Flow', () => {
  it('should complete payment and confirm booking', async () => {
    // 1. Navigate to booking
    // 2. Select ride
    // 3. Click pay
    // 4. Fill payment details
    // 5. Submit
    // 6. Verify confirmation
  });
});
```

## API Integration Reference

### Authentication
All API calls should include JWT token:
```javascript
headers: {
  Authorization: `Bearer ${localStorage.getItem('jwtToken')}`
}
```

### Error Handling
```javascript
try {
  // API call
} catch (error) {
  if (error.response?.status === 401) {
    // Redirect to login
  } else if (error.response?.status === 400) {
    // Validation error
    console.error(error.response.data.message);
  }
}
```

## Advanced Features

### Real-time Ride Tracking
```javascript
WebSocketService.subscribeToPassengerRides(userId, (update) => {
  if (update.status === 'DRIVER_ARRIVING') {
    // Show driver on map
    updateDriverLocation(update.latitude, update.longitude);
  }
});
```

### Receipt Management
```javascript
// Generate receipt PDF
async function generatePDF(bookingId) {
  const response = await axios.get(
    `/api/payment/receipt/${bookingId}`,
    { responseType: 'blob' }
  );
  // Download blob
}
```

---

## Support

For issues or questions:
1. Check component props documentation
2. Review INTEGRATION_EXAMPLE.md
3. Check browser console for errors
4. Verify API endpoint connectivity
5. Check WebSocket status with `WebSocketService.getStatus()`

---

**Happy coding! 🚗✨**
