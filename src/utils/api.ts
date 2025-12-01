// utils/api.ts
type PlainObject = { [key: string]: any };

function stripTrailingSlash(s?: string) {
  return s ? s.replace(/\/+$/, '') : '';
}

/**
 * Priority for API base:
 * 1. Vite: import.meta.env.VITE_API_URL
 * 2. CRA: process.env.REACT_APP_API_URL
 * 3. window.__API_URL__ (runtime override)
 * 4. fallback to current origin (useful for same-origin deployments / dev)
 */
const rawApiBase =
  (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_API_URL) ||
  (typeof process !== 'undefined' && (process as any).env && (process as any).env.REACT_APP_API_URL) ||
  (typeof window !== 'undefined' && (window as any).__API_URL__) ||
  (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : '');

export const API_BASE = stripTrailingSlash(rawApiBase);

function buildQuery(params?: PlainObject) {
  if (!params) return '';
  const str = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) =>
      encodeURIComponent(k) + '=' + encodeURIComponent(Array.isArray(v) ? v.join(',') : v)
    )
    .join('&');
  return str ? '?' + str : '';
}

type FetchJson = unknown | null;

class ApiService {
  private token: string | null = (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
  private debugMode: boolean =
    (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.MODE === 'development') ||
    (typeof process !== 'undefined' && (process as any).env && (process as any).env.NODE_ENV === 'development');

  private log(...args: any[]) {
    if (this.debugMode) console.log('[API]', ...args);
  }

  private syncToken() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('token');
    }
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    this.syncToken();

    // ensure single slash between base and endpoint
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${API_BASE}${normalizedEndpoint}`;

    const hasFormData = options.body instanceof FormData;

    const config: RequestInit = {
      headers: {
        ...(hasFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        ...(options.headers || {}),
      },
      credentials: 'include',
      ...options,
    };

    if (this.debugMode) {
      this.log(
        `${options.method || 'GET'} ${endpoint}`,
        options.body && !hasFormData ? (() => { try { return JSON.parse(options.body as string); } catch { return options.body; } })() : hasFormData ? '[FormData]' : ''
      );
    }

    try {
      const response = await fetch(url, config);
      let data: FetchJson;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          this.clearToken();
          if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
            window.location.replace('/admin/login');
          }
        }

        const errorMessages: Record<number, string> = {
          400: 'Bad Request - Please check your input',
          404: 'Resource not found',
          500: 'Server error - Please try again later',
        };

        const errorMessage =
          (data as any)?.error ||
          errorMessages[response.status] ||
          `HTTP ${response.status}: Request failed`;

        throw new Error(errorMessage);
      }

      if (this.debugMode) this.log(`Response from ${endpoint}:`, data);
      return data;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') localStorage.setItem('token', token);
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') localStorage.removeItem('token');
  }

  // ==== Auth ====
  async login(email: string, password: string) {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data?.token) this.setToken((data as any).token);
    return data;
  }

  async register(name: string, email: string, password: string) {
    const data = await this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    if (data?.token) this.setToken((data as any).token);
    return data;
  }

  // ==== Customer Profile ====
  async upgradeProfile(profileData: { name: string; email: string; phone: string }) {
    return this.request('/api/profile/upgrade', {
      method: 'POST',
      body: JSON.stringify(profileData),
    });
  }

  // ==== Menu (Admin/Owner) ====
  async getMenu(restaurantId: number) {
    return this.request(`/api/menu/${restaurantId}`);
  }

  async addMenuItem(item: any) {
    return this.request('/api/menu/', {
      method: 'POST',
      body: JSON.stringify(item),
    });
  }

  async updateMenuItem(itemId: number, item: any) {
    return this.request(`/api/menu/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(item),
    });
  }

  async deleteMenuItem(itemId: number) {
    return this.request(`/api/menu/${itemId}`, {
      method: 'DELETE',
    });
  }

  async reclassifyMenu(restaurantId: number) {
    return this.request(`/api/menu/reclassify/${restaurantId}`, {
      method: 'POST',
    });
  }

  // ==== Tables ====
  async getTables() {
    return this.request('/api/tables/');
  }

  async addTable(table: any) {
    return this.request('/api/tables/', {
      method: 'POST',
      body: JSON.stringify(table),
    });
  }

  async deleteTable(tableId: number) {
    return this.request(`/api/tables/${tableId}`, {
      method: 'DELETE',
    });
  }

  // Restaurant tables for public flow
  async getTablesForRestaurant(restaurantId: number) {
    return this.request(`/api/restaurants/${restaurantId}/tables`);
  }

  // ==== Orders (Public) ====
  async createOrder(orderData: {
    customerName: string;
    customerPhone: string;
    amount: number;
    restaurant_id: number;
    table_number: number; // human-readable number, e.g., 1
    items: Array<{ id: number; name: string; price: number; quantity: number }>;
    payment_method: 'razorpay' | 'cash' | 'upi';
  }) {
    // Find actual table info by table_number
    const tables: any = await this.getTablesForRestaurant(orderData.restaurant_id);
    const selectedTable = (tables || []).find(
      (t: any) => String(t.number) === String(orderData.table_number)
    );

    if (!selectedTable) {
      throw new Error(
        `Table number ${orderData.table_number} not found for restaurant ${orderData.restaurant_id}`
      );
    }

    // Construct payload matching backend keys and types strictly
    const payload = {
      customerName: orderData.customerName,
      customerPhone: orderData.customerPhone,
      amount: orderData.amount,
      restaurant_id: orderData.restaurant_id,
      table_number: orderData.table_number,
      payment_method: orderData.payment_method,
      items: orderData.items,
    };

    return this.request('/api/customer-order/create-order', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getOrders() {
    return this.request('/api/orders/');
  }

  async updateOrderStatus(orderId: number, status: string) {
    return this.request(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async getOrderById(orderId: number) {
    return this.request(`/api/orders/${orderId}`);
  }

  // ==== Analytics ====
  async getAnalytics(restaurantId: number, params?: PlainObject) {
    const endpoint = `/api/analytics/${restaurantId}` + buildQuery(params);
    return this.request(endpoint);
  }

  // ==== Restaurant (Public + Admin) ====
  async getRestaurantInfo(restaurantId: number) {
    return this.request(`/api/restaurants/${restaurantId}`);
  }

  async getRestaurantSettings() {
    return this.request('/api/settings', { method: 'GET' });
  }

  async updateRestaurantSettings(settings: any) {
    return this.request('/api/settings', {
      method: 'POST',
      body: JSON.stringify(settings),
    });
  }

  // ==== Public Menu ====
  async getPublicMenu(restaurantId: number, tableName: string) {
    return this.request(`/menu/${restaurantId}/${encodeURIComponent(tableName)}`);
  }

  // ==== Utility ====
  async healthCheck() {
    return this.request('/api/health');
  }

  async uploadImage(file: File, type: 'menu' | 'restaurant' = 'menu') {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('type', type);

    const headers: Record<string, string> = {};
    if (this.token) headers.Authorization = `Bearer ${this.token}`;

    return this.request('/api/upload', {
      method: 'POST',
      headers,
      body: formData,
    });
  }
}

export const apiService = new ApiService();
