import { useEffect, useState } from 'react'
import { adminAPI } from '../../services/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { TrendingUp, Car, XCircle, DollarSign } from 'lucide-react'
import toast from 'react-hot-toast'

function ChartTooltip({ active, payload, label, prefix = '' }) {
  if (active && payload && payload.length) {
    return (
      <div className="admin-chart-tooltip" style={{
          background: 'var(--bg-card)', 
          border: '1px solid var(--border-color)', 
          padding: '12px',
          borderRadius: '12px',
          boxShadow: 'var(--shadow)'
      }}>
        <div className="label" style={{ fontWeight: 700, marginBottom: 4, fontSize: 13 }}>{label}</div>
        <div style={{ color: 'var(--accent-primary)', fontWeight: 800 }}>{prefix}{typeof payload[0].value === 'number'
          ? payload[0].value.toLocaleString('en-IN', { maximumFractionDigits: 2 })
          : payload[0].value}
        </div>
      </div>
    )
  }
  return null
}

export default function AdminReports() {
  const [earnings, setEarnings] = useState([])
  const [ridesData, setRidesData] = useState([])
  const [cancellations, setCancellations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setError(null)
        const [e, r, c] = await Promise.all([
          adminAPI.getEarningsReport(),
          adminAPI.getRidesReport(),
          adminAPI.getCancellationsReport(),
        ])
        setEarnings(e.data)
        setRidesData(r.data)
        setCancellations(c.data)
      } catch (err) {
        console.error('Failed to load reports', err)
        setError('Failed to load analytics reports. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  // Summary numbers
  const totalEarnings = earnings.reduce((s, m) => s + (m.earnings || 0), 0)
  const totalRides = ridesData.reduce((s, m) => s + (m.rides || 0), 0)
  const totalCancellations = cancellations.reduce((s, m) => s + (m.cancellations || 0), 0)

  if (loading) {
    return (
      <div className="skeleton-container">
        <div className="skeleton-row" style={{ height: 120, marginBottom: 20 }} />
        <div className="skeleton-row" style={{ height: 240, marginBottom: 20 }} />
        <div className="admin-charts-grid">
          <div className="skeleton-row" style={{ height: 220 }} />
          <div className="skeleton-row" style={{ height: 220 }} />
        </div>
      </div>
    )
  }

  return (
    <div className="admin-page fade-up">
      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}
      
      {/* Summary cards */}
      <div className="admin-stats-grid">
          <div className="admin-stat-card">
              <div className="stat-icon green"><DollarSign size={20} /></div>
              <div className="admin-stat-value stat-earnings">₹{totalEarnings.toLocaleString('en-IN')}</div>
              <div className="admin-stat-label">Earnings (6 mo)</div>
          </div>
          <div className="admin-stat-card">
              <div className="stat-icon blue"><Car size={20} /></div>
              <div className="admin-stat-value stat-number">{totalRides}</div>
              <div className="admin-stat-label">Rides (6 mo)</div>
          </div>
          <div className="admin-stat-card">
              <div className="stat-icon red"><XCircle size={20} /></div>
              <div className="admin-stat-value stat-number">{totalCancellations}</div>
              <div className="admin-stat-label">Cancellations (6 mo)</div>
          </div>
          <div className="admin-stat-card">
              <div className="stat-icon yellow"><TrendingUp size={20} /></div>
              <div className="admin-stat-value stat-number">
                  {totalRides > 0 ? ((totalCancellations/totalRides)*100).toFixed(1) : 0}%
              </div>
              <div className="admin-stat-label">Cancel Rate</div>
          </div>
      </div>

      {/* Earnings Chart */}
      <div className="admin-chart-card" style={{ marginBottom: 24 }}>
        <h3>💰 Monthly Earnings (₹) — Last 6 Months</h3>
        <div style={{ height: 260, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={earnings} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                <Tooltip content={<ChartTooltip prefix="₹" />} cursor={{ fill: 'var(--bg-secondary)' }} />
                <Bar dataKey="earnings" fill="var(--accent-primary)" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
        </div>
      </div>

      {/* Rides and Cancellations side by side */}
      <div className="admin-charts-grid">
        <div className="admin-chart-card">
          <h3>🚗 Monthly Rides</h3>
          <div style={{ height: 200, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ridesData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--bg-secondary)' }} />
                  <Bar dataKey="rides" fill="var(--info)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
          </div>
        </div>

        <div className="admin-chart-card">
          <h3>❌ Monthly Cancellations</h3>
          <div style={{ height: 200, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cancellations}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--bg-secondary)' }} />
                  <Bar dataKey="cancellations" fill="var(--danger)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
