import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './PaymentModal.css';

const PaymentModal = ({ bookingId, totalFare, passengerName, onPaymentSuccess, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [orderData, setOrderData] = useState(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

  useEffect(() => {
    // Create order on mount
    createPaymentOrder();
  }, [bookingId]);

  const createPaymentOrder = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/payment/create-order`,
        {},
        { params: { bookingId } }
      );
      setOrderData(response.data);
      console.log('✓ Payment order created:', response.data);
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to create payment order';
      setError(errorMsg);
      console.error('✗ Payment order creation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!orderData) {
      setError('Order data not available');
      return;
    }

    setPaymentProcessing(true);
    setError(null);

    const options = {
      key: orderData.razorpayKeyId,
      amount: orderData.amount, // Amount in paise
      currency: orderData.currency,
      order_id: orderData.orderId,
      name: 'SmartRide',
      description: `Ride Booking #${bookingId}`,
      prefill: {
        name: passengerName,
        email: localStorage.getItem('userEmail') || '',
      },
      handler: function (response) {
        verifyPayment({
          razorpayPaymentId: response.razorpay_payment_id,
          razorpayOrderId: response.razorpay_order_id,
          razorpaySignature: response.razorpay_signature,
          bookingId: bookingId,
        });
      },
      modal: {
        ondismiss: function () {
          setPaymentProcessing(false);
          setError('Payment cancelled');
        },
      },
      theme: {
        color: '#3399cc',
      },
    };

    // Load Razorpay script if not already loaded
    if (!window.Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => {
        const rzp = new window.Razorpay(options);
        rzp.open();
      };
      document.head.appendChild(script);
    } else {
      const rzp = new window.Razorpay(options);
      rzp.open();
    }
  };

  const verifyPayment = async (paymentData) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/payment/verify`,
        paymentData
      );
      console.log('✓ Payment verified successfully');
      
      // Call success callback
      onPaymentSuccess(paymentData.razorpayPaymentId);
      
      // Show success message
      alert('Payment successful! Your booking is confirmed.');
      onClose();
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Payment verification failed';
      setError(errorMsg);
      console.error('✗ Payment verification failed:', err);
    } finally {
      setPaymentProcessing(false);
    }
  };

  return (
    <div className="payment-modal-overlay">
      <div className="payment-modal">
        <div className="modal-header">
          <h2>Complete Payment</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}

          <div className="payment-summary">
            <div className="summary-item">
              <span>Booking ID:</span>
              <strong>#{bookingId}</strong>
            </div>
            <div className="summary-item">
              <span>Passenger:</span>
              <strong>{passengerName}</strong>
            </div>
            <div className="summary-item total">
              <span>Total Amount:</span>
              <strong>₹{totalFare.toFixed(2)}</strong>
            </div>
          </div>

          {orderData && (
            <div className="payment-details">
              <p className="info-text">
                💳 Click below to proceed with secure Razorpay payment
              </p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button 
            className="btn btn-secondary" 
            onClick={onClose}
            disabled={loading || paymentProcessing}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handlePayment}
            disabled={loading || paymentProcessing || !orderData}
          >
            {paymentProcessing ? 'Processing...' : `Pay ₹${totalFare.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
