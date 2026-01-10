// utils/api.ts

export type PlainObject = Record<string, any>

export interface AuthResponse {
  token: string
  restaurant: {
    id: number
    name: string
    email: string
  }
}

/* ================= BASE URL ================= */

const stripTrailingSlash = (s = '') => s.replace(/\/+$/, '')

const rawApiBase =
  import.meta.env?.VITE_API_URL ||
  (typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.host}`
    : '')

export const API_BASE = stripTrailingSlash(rawApiBase)

/* ================= API SERVICE ================= */

class ApiService {
  private token: string | null =
    typeof window !== 'undefined' ? localStorage.getItem('token') : null

  private debug = import.meta.env?.DEV === true

  private log(...args: any[]) {
    if (this.debug) console.log('[API]', ...args)
  }

  setToken(token: string) {
    this.token = token
    localStorage.setItem('token', token)
  }

  clearToken() {
    this.token = null
    localStorage.removeItem('token')
  }

  private async safeParseJSON(res: Response) {
    const text = await res.text()
    if (!text) return null
    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  }

  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`

    const isFormData = options.body instanceof FormData

    const headers: HeadersInit = {
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    })

    const data = await this.safeParseJSON(response)

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        this.clearToken()
      }
      throw new Error(
        (data as any)?.error || `HTTP ${response.status}`
      )
    }

    return data as T
  }

  /* ================= AUTH ================= */

  login(email: string, password: string) {
    return this.request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }).then((res) => {
      if (res?.token) this.setToken(res.token)
      return res
    })
  }

  register(name: string, email: string, password: string) {
    return this.request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }).then((res) => {
      if (res?.token) this.setToken(res.token)
      return res
    })
  }

  /* ================= TABLES ================= */

  getTablesForRestaurant(restaurantId: number) {
    return this.request(`/api/restaurants/${restaurantId}/tables`)
  }

  addTable(payload: {
    number: string
    seats: number
    restaurant_id: number
  }) {
    return this.request('/api/tables', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  deleteTable(tableId: number) {
    return this.request(`/api/tables/${tableId}`, {
      method: 'DELETE',
    })
  }
}

export const apiService = new ApiService()
