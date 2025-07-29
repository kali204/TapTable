import React, { createContext, useContext, useState, useEffect } from 'react'
import { apiService } from '../utils/api'

interface User {
  id: string
  name: string
  email: string
  restaurantId: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Restore token and user info from storage on mount
  useEffect(() => {
    const token = localStorage.getItem('token')
    const userRaw = localStorage.getItem('user')
    if (token && userRaw) {
      apiService.setToken(token)      // Use latest token for API calls
      try {
        const parsed = JSON.parse(userRaw)
        setUser(parsed)
      } catch {
        setUser(null)
      }
    }
    setLoading(false)
  }, [])

  // Actual login - stores token and user to localStorage
  const login = async (email: string, password: string) => {
    const response = await apiService.login(email, password)
    // expected: { token, restaurant: { ... } }
    if (!response.token || !response.restaurant) throw new Error('Invalid credentials')
    const userData: User = {
      id: response.restaurant.id.toString(),
      name: response.restaurant.name,
      email: response.restaurant.email,
      restaurantId: response.restaurant.id.toString()
    }
    setUser(userData)
    localStorage.setItem('token', response.token)
    localStorage.setItem('user', JSON.stringify(userData))
    apiService.setToken(response.token)
  }

  // Register also persists login
  const register = async (name: string, email: string, password: string) => {
    const response = await apiService.register(name, email, password)
    if (!response.token || !response.restaurant) throw new Error('Registration failed')
    const userData: User = {
      id: response.restaurant.id.toString(),
      name: response.restaurant.name,
      email: response.restaurant.email,
      restaurantId: response.restaurant.id.toString()
    }
    setUser(userData)
    localStorage.setItem('token', response.token)
    localStorage.setItem('user', JSON.stringify(userData))
    apiService.setToken(response.token)
  }

  // Log out: clear everything
  const logout = () => {
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    apiService.clearToken()
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
