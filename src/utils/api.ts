const API_BASE = 'https://taptable.onrender.com'

type PlainObject = { [key: string]: any }

function buildQuery(params?: PlainObject) {
  if (!params) return ""
  const str = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => 
      encodeURIComponent(k) + "=" + encodeURIComponent(Array.isArray(v) ? v.join(",") : v)
    )
    .join("&")
  return str ? "?" + str : ""
}

class ApiService {
  private token: string | null = localStorage.getItem('token')
  private debugMode: boolean = process.env.NODE_ENV === 'development'

  private log(...args: any[]) {
    if (this.debugMode) {
      console.log('[API]', ...args)
    }
  }

  private syncToken() {
    this.token = localStorage.getItem("token")
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    this.syncToken()

    const url = `${API_BASE}${endpoint}`
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
      ...options,
    }

    if (this.debugMode) {
      this.log(`${options.method || 'GET'} ${endpoint}`, options.body ? JSON.parse(options.body as string) : '')
    }

    try {
      const response = await fetch(url, config)
      let data
      try {
        data = await response.json()
      } catch {
        data = null
      }

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          this.clearToken()
          if (window.location.pathname.startsWith('/admin')) {
            window.location.replace("/admin/login")
          }
        }

        const errorMessages = {
          400: 'Bad Request - Please check your input',
          404: 'Resource not found',
          500: 'Server error - Please try again later',
        }

        const errorMessage = data?.error || 
                             errorMessages[response.status as keyof typeof errorMessages] || 
                             `HTTP ${response.status}: Request failed`

        throw new Error(errorMessage)
      }

      if (this.debugMode) {
        this.log(`Response from ${endpoint}:`, data)
      }

      return data
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error)
      throw error
    }
  }

  setToken(token: string) {
    this.token = token
    localStorage.setItem('token', token)
  }

  clearToken() {
    this.token = null
    localStorage.removeItem('token')
  }

  // ==== Auth ====
  async login(email: string, password: string) {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    this.setToken(data.token)
    return data
  }

  async register(name: string, email: string, password: string) {
    const data = await this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    })
    this.setToken(data.token)
    return data
  }

  // ==== Customer Profile ====
  async upgradeProfile(profileData: { name: string; email: string; phone: string }) {
    return this.request('/api/profile/upgrade', {
      method: 'POST',
      body: JSON.stringify(profileData),
    })
  }

  // ==== Menu ====
  async getMenu(restaurantId: number) {
    return this.request(`/api/menu/${restaurantId}`)
  }

  async addMenuItem(item: any) {
    return this.request('/api/menu', {
      method: 'POST',
      body: JSON.stringify(item),
    })
  }

  async updateMenuItem(itemId: number, item: any) {
    return this.request(`/api/menu/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(item),
    })
  }

  async deleteMenuItem(itemId: number) {
    return this.request(`/api/menu/${itemId}`, {
      method: 'DELETE',
    })
  }

  async reclassifyMenu(restaurantId: number) {
    return this.request(`/api/menu/reclassify/${restaurantId}`, {
      method: 'POST',
    })
  }

  // ==== Tables ====
  async getTables() {
    return this.request('/api/tables')
  }

  async addTable(table: any) {
    return this.request('/api/tables', {
      method: 'POST',
      body: JSON.stringify(table),
    })
  }

  async deleteTable(tableId: number) {
    return this.request(`/api/tables/${tableId}`, {
      method: 'DELETE',
    })
  }

  // ==== Orders ====
  async createOrder(orderData: {
    customerName: string;
    customerPhone: string;
    amount: number;
    restaurant_id: number;
    table_number: number;
    items: any[];
  }) {
    return this.request('/api/create-order', {
      method: 'POST',
      body: JSON.stringify(orderData),
    })
  }

  async getOrders() {
    return this.request('/api/orders')
  }

  async updateOrderStatus(orderId: number, status: string) {
    return this.request(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    })
  }

  async getOrderById(orderId: number) {
    return this.request(`/api/orders/${orderId}`)
  }

  // ==== Analytics ====
  async getAnalytics(restaurantId: number, params?: PlainObject) {
    const endpoint = `/api/analytics/${restaurantId}` + buildQuery(params)
    return this.request(endpoint)
  }

  // ==== Restaurant ====
  async getRestaurantInfo(restaurantId: number) {
    return this.request(`/api/restaurants/${restaurantId}`)
  }

  async getRestaurantSettings() {
    return this.request('/api/settings', { method: 'GET' })
  }

  async updateRestaurantSettings(settings: any) {
    return this.request('/api/settings', {
      method: 'POST',
      body: JSON.stringify(settings),
    })
  }

  // ==== Public Menu ====
async getPublicMenu(restaurantId: number, tableName: string) {
  return this.request(`/menu/${restaurantId}/${encodeURIComponent(tableName)}`)
}

  // ==== Utility ====
  async healthCheck() {
    return this.request('/api/health')
  }

  async uploadImage(file: File, type: 'menu' | 'restaurant' = 'menu') {
    const formData = new FormData()
    formData.append('image', file)
    formData.append('type', type)

    const headers = { ...this.token && { Authorization: `Bearer ${this.token}` } }

    return this.request('/api/upload', {
      method: 'POST',
      headers,
      body: formData,
    })
  }
}

export const apiService = new ApiService()
