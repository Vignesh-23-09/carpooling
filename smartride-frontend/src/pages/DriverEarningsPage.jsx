import React, { useState, useEffect, useMemo } from 'react';
import { IndianRupee, Banknote, MapPin, Hash, Search } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import { driverEarningsAPI } from '../services/api';
import './DriverEarningsPage.css';

export default function DriverEarningsPage() {
  const [summary, setSummary] = useState({
    totalEarnings: 0,
    thisMonthEarnings: 0,
    lastMonthEarnings: 0,
    totalRides: 0,
    completedRides: 0,
    totalPassengers: 0,
    averageEarningPerRide: 0
  });
  const [monthlyData, setMonthlyData] = useState([]);
  const [transactions, setTransactions] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    fetchEarningsData();
  }, []);

  const fetchEarningsData = async () => {
    setLoading(true);
    try {
      const [sumRes, monRes, txRes] = await Promise.all([
        driverEarningsAPI.getSummary(),
        driverEarningsAPI.getMonthly(),
        driverEarningsAPI.getTransactions()
      ]);
      setSummary(sumRes.data);
      setMonthlyData(monRes.data);
      setTransactions(txRes.data);
    } catch (error) {
      console.error('Failed to fetch earnings', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const matchesSearch = 
        (tx.passengerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tx.route || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'ALL' || tx.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [transactions, searchTerm, statusFilter]);

  const getStatusBadge = (status) => {
    switch(status) {
      case 'COMPLETED':
        return <span className="badge" style={{ backgroundColor: 'var(--success)' }}>COMPLETED</span>;
      case 'REFUNDED':
        return <span className="badge" style={{ backgroundColor: 'var(--info)' }}>REFUNDED</span>;
      case 'PENDING':
        return <span className="badge" style={{ backgroundColor: 'var(--warning)' }}>PENDING</span>;
      default:
        return <span className="badge" style={{ backgroundColor: 'var(--text-muted)' }}>{status}</span>;
    }
  };

  if (loading) {
    return <div className="loading-state"><span className="spinner"></span> Loading earnings...</div>;
  }

  return (
    <div className="dash-panel fade-up">
      <div className="panel-header">
        <Banknote size={24} style={{ color: 'var(--success)' }} />
        <div>
          <h2>Earnings Dashboard</h2>
          <p>Track your rides and earnings</p>
        </div>
      </div>

      {/* ROW 1: SUMMARY CARDS */}
      <div className="stats-grid">
        <div className="stat-card" style={{ borderLeft: '4px solid var(--success)' }}>
          <div className="stat-icon" style={{ backgroundColor: 'var(--badge-confirmed-bg)' }}>
            <IndianRupee size={24} color="var(--success)" />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Earnings</span>
            <span className="stat-val" style={{ color: 'var(--success)' }}>₹{summary.totalEarnings.toFixed(2)}</span>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid var(--accent-primary)' }}>
          <div className="stat-icon" style={{ backgroundColor: 'var(--badge-completed-bg)' }}>
            <Banknote size={24} color="var(--accent-primary)" />
          </div>
          <div className="stat-info">
            <span className="stat-label">This Month</span>
            <span className="stat-val" style={{ color: 'var(--accent-primary)' }}>₹{summary.thisMonthEarnings.toFixed(2)}</span>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid var(--info)' }}>
          <div className="stat-icon" style={{ backgroundColor: 'var(--badge-completed-bg)' }}>
            <MapPin size={24} color="var(--info)" />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Rides</span>
            <span className="stat-val" style={{ color: 'var(--info)' }}>{summary.totalRides}</span>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid var(--warning)' }}>
          <div className="stat-icon" style={{ backgroundColor: 'var(--badge-pending-bg)' }}>
            <IndianRupee size={24} color="var(--warning)" />
          </div>
          <div className="stat-info">
            <span className="stat-label">Avg per Ride</span>
            <span className="stat-val" style={{ color: 'var(--warning)' }}>₹{summary.averageEarningPerRide.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* ROW 2: MONTHLY CHART */}
      <div className="chart-container">
        <h3>Monthly Earnings</h3>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
              <XAxis dataKey="month" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)' }} />
              <YAxis stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)' }} tickFormatter={(val) => `₹${val}`} />
              <RechartsTooltip 
                cursor={{ fill: 'var(--bg-table-row-hover)' }}
                contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
                formatter={(value) => [`₹${value}`, 'Earnings']}
              />
              <Bar dataKey="earnings" fill="var(--success)" radius={[4, 4, 0, 0]} maxBarSize={50} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ROW 3: TRANSACTION HISTORY */}
      <div className="transactions-container">
        <div className="history-header">
          <div>
            <h3>Transaction History</h3>
            <p className="text-muted" style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Showing {filteredTransactions.length} of {transactions.length} transactions
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div className="input-wrap" style={{ flex: 1, minWidth: '200px' }}>
              <Search size={15} className="input-icon" style={{ color: 'var(--text-muted)' }} />
              <input 
                className="sr-input pl-icon" 
                placeholder="Search passenger or route..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="filter-tabs">
              {['ALL', 'COMPLETED', 'PENDING', 'REFUNDED'].map(status => (
                <button
                  key={status}
                  className={`filter-tab ${statusFilter === status ? 'active' : ''} ${statusFilter === status ? `active-${status.toLowerCase()}` : ''}`}
                  onClick={() => setStatusFilter(status)}
                >
                  {status === 'ALL' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="bookings-table">
            <thead>
              <tr>
                <th><Hash size={14} style={{ marginRight: '4px', verticalAlign: '-2px' }}/> #</th>
                <th>Passenger</th>
                <th>Route</th>
                <th>Date</th>
                <th>Amount (₹)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map(tx => (
                  <tr key={tx.id}>
                    <td style={{ color: 'var(--text-secondary)' }}>#{tx.id}</td>
                    <td style={{ fontWeight: '500' }}>{tx.passengerName}</td>
                    <td><span style={{ whiteSpace: 'nowrap' }}>{tx.route}</span></td>
                    <td style={{ color: 'var(--text-secondary)' }}>{tx.date}</td>
                    <td style={{ fontWeight: '600' }}>{tx.amount > 0 ? `₹${tx.amount.toFixed(2)}` : '0.00'}</td>
                    <td>{getStatusBadge(tx.status)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '48px' }}>
                    <p style={{ color: 'var(--text-secondary)' }}>No transactions found matching criteria</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
