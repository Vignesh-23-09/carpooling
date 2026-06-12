import { useEffect, useState } from 'react'
import { adminAPI, disputeAPI } from '../../services/api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Users, Car, BookOpen, DollarSign, RefreshCw, CheckCircle, XCircle, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'

// Custom tooltip for recharts
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

export default function AdminOverview() {
  const [stats, setStats] = useState(null)
  const [earnings, setEarnings] = useState([])
  const [ridesData, setRidesData] = useState([])
  const [openDisputes, setOpenDisputes] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setError(null)
        const [statsRes, earningsRes, ridesRes, disputesRes] = await Promise.all([
          adminAPI.getStats(),
          adminAPI.getEarningsReport(),
          adminAPI.getRidesReport(),
          disputeAPI.getOpenDisputes(),
        ])
        setStats(statsRes.data)
        setEarnings(earningsRes.data)
        setRidesData(ridesRes.data)
        setOpenDisputes(disputesRes.data.length)
      } catch (err) {
        console.error('Failed to load dashboard stats', err)
        setError('Failed to load dashboard statistics. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  if (loading) {
    return (
      <div className="skeleton-container">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="skeleton-row" style={{ height: i < 3 ? 120 : 60 }} />
        ))}
      </div>
    )
  }

  const statCards = [
    { key: 'totalUsers',     label: 'Total Users',     icon: <Users size={20}/>,     cls: 'blue' },
    { key: 'totalRides',     label: 'Total Rides',     icon: <Car size={20}/>,       cls: 'green' },
    { key: 'totalBookings',  label: 'Total Bookings',  icon: <BookOpen size={20}/>,  cls: 'yellow' },
    { key: 'totalEarnings',  label: 'Total Earnings',  icon: <DollarSign size={20}/>, cls: 'green', isCurrency: true },
  ]

  return (
    <div className="admin-page fade-up">
      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="admin-stats-grid">
        {statCards.map(card => {
          const raw = stats?.[card.key] ?? 0
          const display = card.isCurrency
            ? `₹${Number(raw).toLocaleString('en-IN')}`
            : Number(raw).toLocaleString('en-IN')
          
          return (
            <div key={card.key} className="admin-stat-card">
              <div className={`stat-icon ${card.cls}`}>{card.icon}</div>
              <div className={`admin-stat-value ${card.isCurrency ? 'stat-earnings' : 'stat-number'}`}>
                {display}
              </div>
              <div className="admin-stat-label">{card.label}</div>
            </div>
          )
        })}
      </div>

      {/* Secondary Stats Row */}
      <div className="admin-stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
          {[
            { label: 'Total Drivers',     value: stats?.totalDrivers ?? 0, icon: <Users size={16}/>, cls: 'blue' },
            { label: 'Active Rides',      value: stats?.activeRides ?? 0, icon: <CheckCircle size={16}/>, cls: 'green' },
            { label: 'Cancelled Rides',   value: stats?.cancelledRides ?? 0, icon: <XCircle size={16}/>, cls: 'red' },
            { label: 'Open Disputes',     value: openDisputes, icon: <TrendingUp size={16}/>, cls: 'yellow' },
          ].map(item => (
            <div key={item.label} className="admin-stat-card" style={{ padding: '16px 20px', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className={`stat-icon ${item.cls}`} style={{ width: 32, height: 32, marginBottom: 0 }}>{item.icon}</div>
                    <div className="admin-stat-label" style={{ marginBottom: 0 }}>{item.label}</div>
                </div>
                <div className="admin-stat-value stat-number" style={{ fontSize: '1.4rem' }}>
                    {item.value.toLocaleString('en-IN')}
                </div>
            </div>
          ))}
      </div>

      {/* Charts Grid */}
      <div className="admin-charts-grid" style={{ marginTop: 8 }}>
        <div className="admin-chart-card">
          <h3>📈 Monthly Earnings (₹)</h3>
          <div style={{ height: 240, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={earnings}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <Tooltip content={<ChartTooltip prefix="₹" />} cursor={{ fill: 'var(--bg-secondary)' }} />
                  <Bar dataKey="earnings" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
          </div>
        </div>

        <div className="admin-chart-card">
          <h3>🚗 Monthly Rides</h3>
          <div style={{ height: 240, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ridesData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--bg-secondary)' }} />
                  <Bar dataKey="rides" fill="var(--info)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
