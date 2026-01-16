import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { apiService } from '../utils/api'
import { LineChart, Line, Tooltip, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts'
import '../CSS/AnalyticsDashboard.css' // Assuming you have a CSS file for styles

// Model for revenue trend entry
interface RevenueTrendEntry {
  date: string
  revenue: number
}

interface AnalyticsData {
  total_orders: number
  total_revenue: number
  average_rating: number
  top_items?: string[]
  recent_reviews?: string[]
  revenue_trend?: RevenueTrendEntry[]
  previous_revenue?: number
  previous_orders?: number
  previous_rating?: number
}

export default function AnalyticsDashboard() {
  const { user } = useAuth()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  // Time range selection state
  const [timeRange, setTimeRange] = useState<'7days' | '30days' | 'custom'>('7days')
  const [customRange, setCustomRange] = useState<{start: string; end: string}>({ start: '', end: '' })

  useEffect(() => {
  const fetchAnalytics = async () => {
    try {
      if (!user?.restaurantId) return

      const params: any = { timeRange }

      if (timeRange === 'custom') {
        params.startDate = customRange.start
        params.endDate = customRange.end
      }

      const res = await apiService.getAnalytics(user.restaurantId)
      setData(res)
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  fetchAnalytics()
}, [user, timeRange, customRange])


  if (loading) {
    return (
      <div className="card flex items-center justify-center min-h-40">
        <svg className="animate-spin h-7 w-7 mr-2 text-primary" viewBox="0 0 24 24">
          <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-70" fill="currentColor" d="M4 12a8 8 0 018-8V2C6.477 2 2 6.477 2 12h2z" />
        </svg>
        <span className="ml-2">Loading analytics...</span>
      </div>
    )
  }

  if (!data) {
    return <div className="card">No analytics data available.</div>
  }

  // Comparative stats
  const revenueChange = data.previous_revenue ? data.total_revenue - data.previous_revenue : null
  const ordersChange = data.previous_orders ? data.total_orders - data.previous_orders : null
  const ratingChange = data.previous_rating ? data.average_rating - data.previous_rating : null

  return (
  <div className="analytics-dashboard">
    <div className="analytics-card">
      <div className="analytics-header">
        <h2 className="analytics-title">Analytics & Reports</h2>
      </div>

      {/* Time range selection */}
      <div className="time-range-container">
        <div className="time-range-buttons">
          <button
            className={`time-range-btn ${timeRange === '7days' ? 'active' : ''}`}
            onClick={() => setTimeRange('7days')}
          >
            Last 7 Days
          </button>
          <button
            className={`time-range-btn ${timeRange === '30days' ? 'active' : ''}`}
            onClick={() => setTimeRange('30days')}
          >
            Last 30 Days
          </button>
          <button
            className={`time-range-btn ${timeRange === 'custom' ? 'active' : ''}`}
            onClick={() => setTimeRange('custom')}
          >
            Custom Range
          </button>
        </div>
      </div>

      {/* Custom date selectors */}
      {timeRange === 'custom' && (
        <div className="custom-date-container">
          <input
            type="date"
            value={customRange.start}
            onChange={(e) => setCustomRange((prev) => ({ ...prev, start: e.target.value }))}
            className="date-input"
          />
          <input
            type="date"
            value={customRange.end}
            onChange={(e) => setCustomRange((prev) => ({ ...prev, end: e.target.value }))}
            className="date-input"
          />
        </div>
      )}

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card revenue">
          <h3 className="stat-value revenue-value">
            ₹{typeof data.total_revenue === 'number' ? data.total_revenue.toLocaleString() : '0'}
          </h3>
          <p className="stat-label">
            Total Revenue
            {revenueChange !== null && (
              <span className={`stat-change ${revenueChange >= 0 ? 'positive' : 'negative'}`}>
                {revenueChange >= 0 ? '+' : ''}{revenueChange.toLocaleString()}
              </span>
            )}
          </p>
        </div>
        
        <div className="stat-card orders">
          <h3 className="stat-value orders-value">
            {data.total_orders ?? 0}
          </h3>
          <p className="stat-label">
            Total Orders
            {ordersChange !== null && (
              <span className={`stat-change ${ordersChange >= 0 ? 'positive' : 'negative'}`}>
                {ordersChange >= 0 ? '+' : ''}{ordersChange}
              </span>
            )}
          </p>
        </div>
        
        <div className="stat-card rating">
          <h3 className="stat-value rating-value">
            ⭐ {data.average_rating ? data.average_rating.toFixed(1) : '0.0'}
          </h3>
          <p className="stat-label">
            Avg Rating
            {ratingChange !== null && (
              <span className={`stat-change ${ratingChange >= 0 ? 'positive' : 'negative'}`}>
                {ratingChange >= 0 ? '+' : ''}{ratingChange.toFixed(1)}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Revenue Chart */}
      {data.revenue_trend && data.revenue_trend.length > 0 && (
        <div className="chart-container">
          <h4 className="chart-title">Revenue Trend</h4>
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={data.revenue_trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Items */}
      {data.top_items && (
        <div className="top-items-container">
          <h4 className="section-title top-items">Top Selling Items</h4>
          {data.top_items.length > 0 ? (
            <ol className="top-items-list">
              {data.top_items.map((item, i) => (
                <li key={i} className="top-item">
                  <span className="item-name">{item}</span>
                </li>
              ))}
            </ol>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📊</div>
              <p>No top items yet.</p>
            </div>
          )}
        </div>
      )}

      {/* Reviews */}
      {data.recent_reviews && (
        <div className="reviews-container">
          <h4 className="section-title reviews">Recent Reviews</h4>
          {data.recent_reviews.length > 0 ? (
            <ul className="reviews-list">
              {data.recent_reviews.map((review, i) => (
                <li key={i} className="review-item">
                  <span className="review-icon">⭐</span>
                  <p className="review-text">{review}</p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">💬</div>
              <p>No reviews yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  </div>
);

}
