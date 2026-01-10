import React, { createContext, useContext, useState, useEffect } from 'react'
import { apiService, AuthResponse } from '../utils/api'

interface User {
  id: number
  name: string
  email: string
  restaurantId: number
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

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userRaw = localStorage.getItem('user')

    if (token && userRaw) {
      apiService.setToken(token)
      setUser(JSON.parse(userRaw))
    }
    setLoading(false)
  }, [])

  const mapAuthResponseToUser = (res: AuthResponse): User => ({
    id: res.restaurant.id,
    name: res.restaurant.name,
    email: res.restaurant.email,
    restaurantId: res.restaurant.id,
  })

  const login = async (email: string, password: string) => {
    const res: AuthResponse = await apiService.login(email, password)
    const userData = mapAuthResponseToUser(res)

    setUser(userData)
    localStorage.setItem('token', res.token)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  const register = async (name: string, email: string, password: string) => {
    const res: AuthResponse = await apiService.register(name, email, password)
    const userData = mapAuthResponseToUser(res)

    setUser(userData)
    localStorage.setItem('token', res.token)
    localStorage.setItem('user', JSON.stringify(userData))
  }

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
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
