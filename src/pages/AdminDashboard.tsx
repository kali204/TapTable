import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Navigate } from 'react-router-dom'
import { Users, ShoppingBag, Star, Settings, LogOut, BarChart3, Menu, X } from 'lucide-react'
import MenuManagement from '../components/MenuManagement'
import TableManagement from '../components/TableManagement'
import OrderManagement from '../components/OrderManagement'
import AnalyticsDashboard from '../components/AnalyticsDashboard'
import RestaurantSettings from '../components/RestaurantSetting'
import './CSS/AdminDashboard.css'

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState<'orders' | 'menu' | 'tables' | 'analytics' | 'settings'>('orders')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  if (!user) {
    return <Navigate to="/admin/login" replace />
  }

  const tabs = [
    { id: 'orders', label: 'Live Orders', icon: ShoppingBag, description: 'Manage incoming orders' },
    { id: 'menu', label: 'Menu Items', icon: Star, description: 'Edit your menu' },
    { id: 'tables', label: 'Tables', icon: Users, description: 'Table management' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, description: 'Performance insights' },
    { id: 'settings', label: 'Settings', icon: Settings, description: 'Restaurant settings' }
  ]

  const activeTabData = tabs.find(tab => tab.id === activeTab)

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <button 
              className="mobile-menu-btn"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <Menu size={24} />
            </button>
            
            <div className="brand-logo">
              <div className="logo-icon">
                <span className="logo-text">T</span>
                <div className="logo-pulse"></div>
              </div>
              <div className="brand-info">
                <span className="brand-name">TapTable</span>
                <span className="brand-subtitle">Restaurant Dashboard</span>
              </div>
            </div>
          </div>
          
          <div className="header-right">
            <div className="user-info">
              <div className="user-avatar">
                {(user.name || 'Admin').charAt(0).toUpperCase()}
              </div>
              <div className="user-details">
                <span className="user-name">Welcome, {user.name || 'Admin'}</span>
                <span className="user-role">Restaurant Owner</span>
              </div>
            </div>
            
            <button onClick={logout} className="logout-btn">
              <LogOut size={20} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="dashboard-body">
        {/* Sidebar */}
        <aside className={`sidebar ${isSidebarOpen ? 'sidebar-open' : ''}`}>
          <div className="sidebar-content">
            {/* Mobile Close Button */}
            <button 
              className="sidebar-close"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X size={24} />
            </button>
            
            {/* Navigation */}
            <nav className="sidebar-nav">
              <div className="nav-header">
                <h3>Navigation</h3>
              </div>
              
              <div className="nav-items">
                {tabs.map(tab => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id as typeof activeTab)
                        setIsSidebarOpen(false) // Close mobile sidebar on selection
                      }}
                      className={`nav-item ${isActive ? 'active' : ''}`}
                    >
                      <div className="nav-item-content">
                        <div className="nav-icon">
                          <Icon size={20} />
                        </div>
                        <div className="nav-text">
                          <span className="nav-label">{tab.label}</span>
                          <span className="nav-description">{tab.description}</span>
                        </div>
                      </div>
                      {isActive && <div className="nav-indicator"></div>}
                    </button>
                  )
                })}
              </div>
            </nav>

            {/* Sidebar Footer */}
            <div className="sidebar-footer">
              <div className="footer-content">
                <div className="footer-logo">
                  <div className="footer-icon">T</div>
                  <div>
                    <div className="footer-title">TapTable Pro</div>
                    <div className="footer-version">v2.0.1</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile Overlay */}
        {isSidebarOpen && (
          <div 
            className="sidebar-overlay"
            onClick={() => setIsSidebarOpen(false)}
          ></div>
        )}

        {/* Main Content */}
        <main className="main-content">
          {/* Content Header */}
          <div className="content-header">
            <div className="content-title">
              <h1>{activeTabData?.label}</h1>
              <p>{activeTabData?.description}</p>
            </div>
          </div>

          {/* Content Body */}
          <div className="content-body">
            {activeTab === 'orders' && <OrderManagement />}
            {activeTab === 'menu' && <MenuManagement />}
            {activeTab === 'tables' && <TableManagement />}
            {activeTab === 'analytics' && <AnalyticsDashboard />}
            {activeTab === 'settings' && <RestaurantSettings />}
          </div>
        </main>
      </div>
    </div>
  )
}