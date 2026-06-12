import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './TransactionHistory.css';

const TransactionHistory = () => {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';
  const token = localStorage.getItem('jwtToken');

  useEffect(() => {
    loadReceipts();
  }, []);

  const loadReceipts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/payment/receipts`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setReceipts(response.data);
      console.log('✓ Loaded transaction history:', response.data);
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to load receipts';
      setError(errorMsg);
      console.error('✗ Failed to load receipts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReceipt = async (bookingId) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/payment/receipt/${bookingId}/download`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          responseType: 'blob',
        }
      );
      // Create blob download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `receipt-${bookingId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error('✗ Failed to download receipt:', err);
      alert('Failed to download receipt');
    }
  };

  const getFilteredReceipts = () => {
    if (filterStatus === 'all') return receipts;
    return receipts.filter((r) => r.paymentStatus === filterStatus);
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'PAID':
        return 'badge-success';
      case 'CONFIRMED':
        return 'badge-info';
      case 'PENDING_PAYMENT':
        return 'badge-warning';
      case 'PAYMENT_FAILED':
        return 'badge-danger';
      case 'CANCELLED':
        return 'badge-secondary';
      default:
        return 'badge-default';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="transaction-history">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading transaction history...</p>
        </div>
      </div>
    );
  }

  const filteredReceipts = getFilteredReceipts();

  return (
    <div className="transaction-history">
      <div className="history-header">
        <h2>📋 Transaction History & Receipts</h2>
        <p>View all your ride bookings and payments</p>
      </div>

      {error && (
        <div className="error-alert">
          ⚠️ {error}
          <button onClick={loadReceipts}>Retry</button>
        </div>
      )}

      <div className="filter-section">
        <label>Filter by Status:</label>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">All Transactions</option>
          <option value="PAID">Paid</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="PENDING_PAYMENT">Pending Payment</option>
          <option value="PAYMENT_FAILED">Failed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {filteredReceipts.length === 0 ? (
        <div className="empty-state">
          <h3>No transactions found</h3>
          <p>Your booking history will appear here</p>
        </div>
      ) : (
        <div className="receipts-table-container">
          <table className="receipts-table">
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Driver</th>
                <th>Route</th>
                <th>Date</th>
                <th>Distance</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReceipts.map((receipt) => (
                <tr key={receipt.bookingId} className="receipt-row">
                  <td className="booking-id">#{receipt.bookingId}</td>
                  <td className="driver-name">{receipt.driverName}</td>
                  <td className="route">
                    <div className="route-short">
                      {receipt.source.substring(0, 8)}...
                      <span className="arrow">→</span>
                      {receipt.destination.substring(0, 8)}...
                    </div>
                  </td>
                  <td className="date">{formatDate(receipt.bookingTime)}</td>
                  <td className="distance">{receipt.distanceKm?.toFixed(1) || 'N/A'} km</td>
                  <td className="amount">
                    <strong>₹{receipt.totalFare?.toFixed(2) || 'N/A'}</strong>
                  </td>
                  <td className="status">
                    <span className={`badge ${getStatusBadgeClass(receipt.paymentStatus)}`}>
                      {receipt.paymentStatus}
                    </span>
                  </td>
                  <td className="actions">
                    <button
                      className="btn-action btn-view"
                      onClick={() => setSelectedReceipt(receipt)}
                      title="View Receipt"
                    >
                      👁️ View
                    </button>
                    <button
                      className="btn-action btn-download"
                      onClick={() => handleDownloadReceipt(receipt.bookingId)}
                      title="Download Receipt"
                    >
                      ⬇️ Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Receipt Detail Modal */}
      {selectedReceipt && (
        <div className="receipt-modal-overlay" onClick={() => setSelectedReceipt(null)}>
          <div className="receipt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Receipt Details</h3>
              <button className="close-btn" onClick={() => setSelectedReceipt(null)}>×</button>
            </div>

            <div className="modal-body receipt-details">
              <div className="receipt-section">
                <h4>Booking Information</h4>
                <div className="detail-row">
                  <span>Booking ID:</span>
                  <strong>#{selectedReceipt.bookingId}</strong>
                </div>
                <div className="detail-row">
                  <span>Ride ID:</span>
                  <strong>#{selectedReceipt.rideId}</strong>
                </div>
                <div className="detail-row">
                  <span>Booking Time:</span>
                  <strong>{formatDate(selectedReceipt.bookingTime)}</strong>
                </div>
              </div>

              <div className="receipt-section">
                <h4>Trip Details</h4>
                <div className="trip-route">
                  <div className="route-point">
                    <span className="label">From:</span>
                    <span>{selectedReceipt.source}</span>
                  </div>
                  <div className="route-arrow">↓</div>
                  <div className="route-point">
                    <span className="label">To:</span>
                    <span>{selectedReceipt.destination}</span>
                  </div>
                </div>
                <div className="detail-row">
                  <span>Distance:</span>
                  <strong>{selectedReceipt.distanceKm?.toFixed(2) || 'N/A'} km</strong>
                </div>
              </div>

              <div className="receipt-section">
                <h4>Driver Information</h4>
                <div className="detail-row">
                  <span>Driver Name:</span>
                  <strong>{selectedReceipt.driverName}</strong>
                </div>
                <div className="detail-row">
                  <span>Vehicle:</span>
                  <strong>{selectedReceipt.carModel}</strong>
                </div>
                <div className="detail-row">
                  <span>License Plate:</span>
                  <strong>{selectedReceipt.licensePlate}</strong>
                </div>
              </div>

              <div className="receipt-section">
                <h4>Fare Breakdown</h4>
                <div className="detail-row">
                  <span>Fare per Seat:</span>
                  <strong>₹{selectedReceipt.farePerSeat?.toFixed(2) || 'N/A'}</strong>
                </div>
                <div className="detail-row">
                  <span>Number of Seats:</span>
                  <strong>{selectedReceipt.seatCount}</strong>
                </div>
                <div className="detail-row total">
                  <span>Total Amount:</span>
                  <strong>₹{selectedReceipt.totalFare?.toFixed(2) || 'N/A'}</strong>
                </div>
              </div>

              <div className="receipt-section">
                <h4>Payment Information</h4>
                <div className="detail-row">
                  <span>Payment ID:</span>
                  <strong>{selectedReceipt.razorpayPaymentId || 'N/A'}</strong>
                </div>
                <div className="detail-row">
                  <span>Status:</span>
                  <span className={`badge ${getStatusBadgeClass(selectedReceipt.paymentStatus)}`}>
                    {selectedReceipt.paymentStatus}
                  </span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setSelectedReceipt(null)}
              >
                Close
              </button>
              <button
                className="btn btn-primary"
                onClick={() => handleDownloadReceipt(selectedReceipt.bookingId)}
              >
                ⬇️ Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;
