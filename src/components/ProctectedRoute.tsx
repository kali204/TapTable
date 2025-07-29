// components/ProtectedRoute.tsx
import { useAuth } from '../contexts/AuthContext'
import { Navigate } from 'react-router-dom'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex justify-center py-20"><span>Loading...</span></div>
  if (!user) return <Navigate to="/admin/login" replace />
  return <>{children}</>
}
