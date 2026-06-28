import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
})

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      const refresh = localStorage.getItem('refresh_token')
      if (refresh) {
        try {
          const { data } = await axios.post('/api/v1/auth/refresh', { refresh_token: refresh })
          localStorage.setItem('access_token', data.access_token)
          localStorage.setItem('refresh_token', data.refresh_token)
          error.config.headers.Authorization = `Bearer ${data.access_token}`
          return api(error.config)
        } catch {
          localStorage.clear()
          window.location.href = '/login'
        }
      } else {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// ── Auth ──────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  logout: (refresh_token) => api.post('/auth/logout', { refresh_token }),
}

// ── QR Codes ──────────────────────────────────────────────────
export const qrAPI = {
  list: (params) => api.get('/qr/', { params }),
  create: (data) => api.post('/qr/', data),
  get: (id) => api.get(`/qr/${id}`),
  update: (id, data) => api.put(`/qr/${id}`, data),
  delete: (id) => api.delete(`/qr/${id}`),
  imageUrl: (id) => `/api/v1/qr/${id}/image`,
  analytics: (id) => api.get(`/qr/${id}/analytics`),
}

// ── Billing ───────────────────────────────────────────────────
export const billingAPI = {
  plans: () => api.get('/billing/plans'),
  status: () => api.get('/billing/status'),
  checkout: (plan) => api.post('/billing/checkout', { plan }),
  renewFree: () => api.post('/billing/renew-free'),
}

export default api
