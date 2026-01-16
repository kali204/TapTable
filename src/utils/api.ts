// src/utils/api.ts

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
      throw new Error((data as any)?.error || `HTTP ${response.status}`)
    }

    return data as T
  }

  /* ================= AUTH ================= */

  login(email: string, password: string) {
    return this.request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }).then(res => {
      if (res?.token) this.setToken(res.token)
      return res
    })
  }

  register(name: string, email: string, password: string) {
    return this.request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }).then(res => {
      if (res?.token) this.setToken(res.token)
      return res
    })
  }

  /* ================= RESTAURANT (PUBLIC) ================= */

  getRestaurantInfo(restaurantId: number) {
    return this.request(`/api/restaurants/${restaurantId}`)
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

  /* ================= MENU ================= */
  // BACKEND: /api/menu/<restaurant_id>

  getMenu(restaurantId: number) {
    return this.request(`/api/menu/${restaurantId}`)
  }

  addMenuItem(payload: PlainObject) {
    return this.request('/api/menu/', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  updateMenuItem(menuItemId: number, payload: PlainObject) {
    return this.request(`/api/menu/${menuItemId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  }

  deleteMenuItem(menuItemId: number) {
    return this.request(`/api/menu/${menuItemId}`, {
      method: 'DELETE',
    })
  }
  reclassifyMenu(restaurantId: number) {
    return this.request(`/api/menu/${restaurantId}/reclassify`, {
      method: 'POST',
    })
  }

  /* ================= ORDERS (ADMIN) ================= */

  getOrders(restaurantId: number) {
  return this.request(`/api/orders?restaurant_id=${restaurantId}/orders`)
}


  updateOrderStatus(orderId: number, status: string) {
  return this.request(`/api/orders/${orderId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  })
}


  /* ================= CUSTOMER ORDERS ================= */
  // BACKEND: customer_order_bp → /api/customer/orders

  createOrder(payload: {
  restaurant_id: number
  table_number: number
  customerName: string
  customerPhone: string
  amount: number
  payment_method: 'upi' | 'razorpay'
  items: {
    id: number
    name: string
    price: number
    quantity: number
  }[]
}) {
  return this.request('/api/customer-order/create-order', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}


  /* ================= ANALYTICS ================= */

  getAnalytics(
    restaurantId: number,
    params?: {
      timeRange?: '7days' | '30days' | 'custom'
      startDate?: string
      endDate?: string
    }
  ) {
    const query = new URLSearchParams()

    if (params?.timeRange) query.append('timeRange', params.timeRange)
    if (params?.startDate) query.append('startDate', params.startDate)
    if (params?.endDate) query.append('endDate', params.endDate)

    const qs = query.toString()

    return this.request(
      `/api/analytics/${restaurantId}${qs ? `?${qs}` : ''}`
    )
  }

  /* ================= SETTINGS ================= */

  getRestaurantSettings(restaurantId: number) {
    return this.request(`/api/settings/${restaurantId}`)
  }

  updateRestaurantSettings(restaurantId: number, payload: PlainObject) {
    return this.request(`/api/settings/${restaurantId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  }
}

export const apiService = new ApiService()
