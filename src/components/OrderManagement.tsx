import { useState, useEffect } from 'react'
import { apiService } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import { Clock, CheckCircle, User, Phone, Utensils, RefreshCw, Filter, Search } from 'lucide-react'

interface Order {
  id: string
  tableNumber: number
  customerName: string
  customerPhone: string
  items: { name: string; quantity: number; price: number }[]
  total: number
  status: 'pending' | 'preparing' | 'ready' | 'completed'
  timestamp: string | Date
}

export default function OrderManagement() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [error, setError] = useState<string | null>(null)
  const [statusUpdating, setStatusUpdating] = useState<{ [id: string]: boolean }>({})
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | Order['status']>('all')
  

  useEffect(() => {
    if (user) {
      loadOrders()
      const interval = setInterval(loadOrders, 30000)
      return () => clearInterval(interval)
    }
  }, [user])

  const loadOrders = async () => {
  if (!user?.restaurantId) return

  setIsRefreshing(true)
  try {
    const ordersData = await apiService.getOrders(user.restaurantId)

    setOrders(
      ordersData.map((order: any) => ({
        ...order,
        id: order.id.toString(),
        timestamp: order.timestamp,
      }))
    )

    setError(null)
  } catch (error) {
    console.error('Failed to load orders:', error)
    setError('Unable to fetch live orders. Please try again later.')
    setOrders([])
  } finally {
    setIsRefreshing(false)
  }
}


  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    setStatusUpdating(s => ({ ...s, [orderId]: true }))
    try {
      await apiService.updateOrderStatus(parseInt(orderId), newStatus)
      loadOrders()
    } catch (error) {
      console.error('Failed to update order status:', error)
      setOrders(prev => prev.map(order =>
        order.id === orderId ? { ...order, status: newStatus } : order
      ))
    } finally {
      setStatusUpdating(s => ({ ...s, [orderId]: false }))
    }
  }

  const getStatusConfig = (status: Order['status']) => {
    switch (status) {
      case 'pending': 
        return { 
          color: 'status-pending', 
          icon: Clock, 
          label: 'Pending',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200'
        }
      case 'preparing': 
        return { 
          color: 'status-preparing', 
          icon: Utensils, 
          label: 'Preparing',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        }
      case 'ready': 
        return { 
          color: 'status-ready', 
          icon: CheckCircle, 
          label: 'Ready',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        }
      case 'completed': 
        return { 
          color: 'status-completed', 
          icon: CheckCircle, 
          label: 'Completed',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        }
    }
  }

  const getTimeAgo = (timestamp: string | Date | undefined) => {
    if (!timestamp) return '';
    const t = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    const diff = Date.now() - t.getTime();
    if (diff < 60000) return 'Just now';
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  // Filter and search orders
  const filteredOrders = orders
    .filter(order => {
      if (statusFilter !== 'all' && order.status !== statusFilter) return false;
      if (searchTerm && !order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !order.tableNumber.toString().includes(searchTerm)) return false;
      return true;
    })
    .filter(order => order.status !== 'completed')
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const getStatusCounts = () => {
    return {
      pending: orders.filter(o => o.status === 'pending').length,
      preparing: orders.filter(o => o.status === 'preparing').length,
      ready: orders.filter(o => o.status === 'ready').length,
      completed: orders.filter(o => o.status === 'completed').length,
    }
  }

  const statusCounts = getStatusCounts()

  return (
    <div className="order-management">
      {/* Header Section */}
      <div className="order-header">
        <div className="header-content">
          <div className="header-title">
            <div className="title-icon">
              <Utensils size={28} />
            </div>
            <div>
              <h1 className="title">Live Orders</h1>
              <p className="subtitle">TapTable Order Management Dashboard</p>
            </div>
          </div>
          
          <button 
            onClick={loadOrders}
            disabled={isRefreshing}
            className="refresh-btn"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Status Overview */}
        <div className="status-overview">
          <div className="status-card pending">
            <div className="status-icon">
              <Clock size={20} />
            </div>
            <div className="status-info">
              <span className="status-count">{statusCounts.pending}</span>
              <span className="status-label">Pending</span>
            </div>
          </div>
          
          <div className="status-card preparing">
            <div className="status-icon">
              <Utensils size={20} />
            </div>
            <div className="status-info">
              <span className="status-count">{statusCounts.preparing}</span>
              <span className="status-label">Preparing</span>
            </div>
          </div>
          
          <div className="status-card ready">
            <div className="status-icon">
              <CheckCircle size={20} />
            </div>
            <div className="status-info">
              <span className="status-count">{statusCounts.ready}</span>
              <span className="status-label">Ready</span>
            </div>
          </div>
          
          <div className="status-card completed">
            <div className="status-icon">
              <CheckCircle size={20} />
            </div>
            <div className="status-info">
              <span className="status-count">{statusCounts.completed}</span>
              <span className="status-label">Completed</span>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="filters-section">
          <div className="search-bar">
            <Search className="search-icon" size={18} />
            <input
              type="text"
              placeholder="Search by customer name or table..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="filter-dropdown">
            <Filter size={18} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="filter-select"
            >
              <option value="all">All Orders</option>
              <option value="pending">Pending</option>
              <option value="preparing">Preparing</option>
              <option value="ready">Ready</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="error-banner">
          <div className="error-content">
            <div className="error-icon">⚠️</div>
            <span>{error}</span>
          </div>
          <button onClick={loadOrders} className="error-retry">
            Try Again
          </button>
        </div>
      )}

      {/* Orders Grid */}
      <div className="orders-grid">
        {filteredOrders.map(order => {
          const statusConfig = getStatusConfig(order.status)
          const StatusIcon = statusConfig.icon
          
          return (
            <div key={order.id} className={`order-card ${statusConfig.color}`}>
              <div className="order-header-card">
                <div className="order-info">
                  <div className="table-info">
                    <span className="table-number">Table {order.tableNumber}</span>
                    <div className="order-time">
                      <Clock className="time-icon" size={14} />
                      <span>{getTimeAgo(order.timestamp)}</span>
                    </div>
                  </div>
                </div>
                <div className={`order-status ${statusConfig.color}`}>
                  <StatusIcon size={16} />
                  <span>{statusConfig.label}</span>
                </div>
              </div>

              <div className="customer-info">
                <div className="customer-item">
                  <User className="customer-icon" size={16} />
                  <span>{order.customerName}</span>
                </div>
                <div className="customer-item">
                  <Phone className="customer-icon" size={16} />
                  <span>{order.customerPhone}</span>
                </div>
              </div>

              <div className="order-items">
                <h4 className="items-title">Order Items</h4>
                <div className="items-list">
                  {(Array.isArray(order.items) ? order.items : []).map((item, index) => (
                    <div key={index} className="item-row">
                      <div className="item-info">
                        <span className="item-quantity">{item.quantity}×</span>
                        <span className="item-name">{item.name}</span>
                      </div>
                      <span className="item-price">₹{(item.quantity * item.price).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="order-footer">
                <div className="order-total">
                  <span className="total-label">Total Amount</span>
                  <span className="total-amount">₹{order.total.toFixed(2)}</span>
                </div>
                
                <div className="order-actions">
                  {order.status === 'pending' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'preparing')}
                      disabled={!!statusUpdating[order.id]}
                      className="action-btn primary"
                    >
                      {statusUpdating[order.id] ? (
                        <RefreshCw className="btn-spinner" size={16} />
                      ) : (
                        <Utensils size={16} />
                      )}
                      <span>Start Preparing</span>
                    </button>
                  )}
                  
                  {order.status === 'preparing' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'ready')}
                      disabled={!!statusUpdating[order.id]}
                      className="action-btn success"
                    >
                      {statusUpdating[order.id] ? (
                        <RefreshCw className="btn-spinner" size={16} />
                      ) : (
                        <CheckCircle size={16} />
                      )}
                      <span>Mark Ready</span>
                    </button>
                  )}
                  
                  {order.status === 'ready' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'completed')}
                      disabled={!!statusUpdating[order.id]}
                      className="action-btn secondary"
                    >
                      {statusUpdating[order.id] ? (
                        <RefreshCw className="btn-spinner" size={16} />
                      ) : (
                        <CheckCircle size={16} />
                      )}
                      <span>Complete Order</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Empty State */}
      {filteredOrders.length === 0 && !error && (
        <div className="empty-state">
          <div className="empty-content">
            <div className="empty-icon">
              <Utensils size={64} />
            </div>
            <h3 className="empty-title">
              {searchTerm || statusFilter !== 'all' ? 'No matching orders' : 'No active orders'}
            </h3>
            <p className="empty-description">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your filters or search terms'
                : 'New orders from TapTable will appear here in real-time'
              }
            </p>
            {(searchTerm || statusFilter !== 'all') && (
              <button 
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('all')
                }}
                className="clear-filters-btn"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
import './CSS/OrderManagement.css'