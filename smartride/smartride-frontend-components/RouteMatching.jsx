import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './RouteMatching.css';

const RouteMatching = ({ source, destination, date, onSelectRide }) => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterBy, setFilterBy] = useState('quality'); // quality, price, distance

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

  useEffect(() => {
    findMatchingRides();
  }, [source, destination, date]);

  const findMatchingRides = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/routes/find-matches`,
        {},
        {
          params: {
            source: source ? source.toLowerCase().trim() : '',
            destination: destination ? destination.toLowerCase().trim() : '',
            date,
          },
        }
      );
      setMatches(response.data);
      console.log('✓ Found matching rides:', response.data);
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to find matching rides';
      setError(errorMsg);
      console.error('✗ Route matching failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSortedMatches = () => {
    const sorted = [...matches];
    switch (filterBy) {
      case 'price':
        return sorted.sort((a, b) => a.estimatedFare - b.estimatedFare);
      case 'distance':
        return sorted.sort((a, b) => a.distanceKm - b.distanceKm);
      case 'quality':
      default:
        return sorted.sort((a, b) => b.matchQuality - a.matchQuality);
    }
  };

  const getMatchTypeLabel = (type) => {
    const labels = {
      DIRECT_MATCH: { label: '🎯 Direct Match', color: '#27ae60' },
      PARTIAL_MATCH: { label: '✓ Partial Match', color: '#f39c12' },
      FLEXIBLE_MATCH: { label: '◆ Flexible Match', color: '#3498db' },
    };
    return labels[type] || { label: type, color: '#95a5a6' };
  };

  const calculateMatchPercentage = (match) => {
    return Math.round(match.matchPercentage * 100);
  };

  if (loading) {
    return (
      <div className="route-matching">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Finding best matching rides...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="route-matching">
      <div className="matching-header">
        <h2>Smart Route Matching Results</h2>
        <p>🔄 {matches.length} ride(s) found matching your route</p>
      </div>

      {error && (
        <div className="error-alert">
          ⚠️ {error}
          <button onClick={findMatchingRides}>Retry</button>
        </div>
      )}

      {matches.length === 0 ? (
        <div className="no-matches">
          <h3>No matching rides found</h3>
          <p>Try searching with different dates or locations</p>
        </div>
      ) : (
        <>
          <div className="filter-controls">
            <label>Sort by:</label>
            <select value={filterBy} onChange={(e) => setFilterBy(e.target.value)}>
              <option value="quality">Match Quality</option>
              <option value="price">Price (Low to High)</option>
              <option value="distance">Distance</option>
            </select>
          </div>

          <div className="matches-list">
            {getSortedMatches().map((match, index) => {
              const typeInfo = getMatchTypeLabel(match.matchType);
              const matchPercent = calculateMatchPercentage(match);

              return (
                <div key={match.rideId} className="match-card">
                  <div className="match-type-badge">
                    <span style={{ color: typeInfo.color }}>{typeInfo.label}</span>
                    <span className="match-percentage">{matchPercent}% match</span>
                  </div>

                  <div className="driver-info">
                    <div className="driver-avatar">
                      {match.driverName.charAt(0).toUpperCase()}
                    </div>
                    <div className="driver-details">
                      <h4>{match.driverName}</h4>
                      <div className="rating">
                        {'⭐'.repeat(Math.round(match.driverRating))}
                        <span>({match.driverRating?.toFixed(1) || 'N/A'})</span>
                      </div>
                    </div>
                  </div>

                  <div className="route-details">
                    <div className="route-point">
                      <span className="label">From:</span>
                      <span className="value">{match.source}</span>
                    </div>
                    <div className="route-arrow">→</div>
                    <div className="route-point">
                      <span className="label">To:</span>
                      <span className="value">{match.destination}</span>
                    </div>
                  </div>

                  <div className="vehicle-info">
                    <span className="vehicle-type">{match.vehicleType}</span>
                    <span className="seats">🪑 {match.availableSeats} seats</span>
                  </div>

                  <div className="ride-stats">
                    <div className="stat">
                      <span className="label">Distance:</span>
                      <span className="value">{match.distanceKm?.toFixed(1) || 'N/A'} km</span>
                    </div>
                    <div className="stat">
                      <span className="label">Quality Score:</span>
                      <div className="quality-bar">
                        <div 
                          className="quality-fill"
                          style={{ width: `${(match.matchQuality / 10) * 100}%` }}
                        ></div>
                      </div>
                      <span className="score">{match.matchQuality}/10</span>
                    </div>
                  </div>

                  <div className="fare-info">
                    <span className="fare-label">Estimated Fare:</span>
                    <span className="fare-amount">₹{match.estimatedFare?.toFixed(2) || 'N/A'}</span>
                  </div>

                  <button
                    className="btn-select-ride"
                    onClick={() => onSelectRide(match)}
                  >
                    Select Ride
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default RouteMatching;
