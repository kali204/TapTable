import { Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import CustomerMenu from './customer/CustomerMenu.tsx'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProctectedRoute' 
import ScrollToTop from './components/ScrolltoTop.tsx'
function App() {
  return (
    <AuthProvider>
      <ScrollToTop/>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/menu/:restaurantId/:tableId" element={<CustomerMenu />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
