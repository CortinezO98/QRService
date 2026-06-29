/**
 * API Client — Sprint 3: agrega campaignsAPI
 */
import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
  withCredentials: true,
})

let isRefreshing = false
let failedQueue = []

const processQueue = (error) => {
  failedQueue.forEach(prom => error ? prom.reject(error) : prom.resolve())
  failedQueue = []
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/login')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(() => api(originalRequest))
          .catch(err => Promise.reject(err))
      }
      originalRequest._retry = true
      isRefreshing = true
      try {
        await axios.post('/api/v1/auth/refresh', {}, { withCredentials: true })
        processQueue(null)
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError)
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(error)
  }
)

// ── Auth ──────────────────────────────────────────────────────
export const authAPI = {
  register:  (data) => api.post('/auth/register', data),
  login:     (data) => api.post('/auth/login', data),
  me:        () => api.get('/auth/me'),
  logout:    () => api.post('/auth/logout'),
  refresh:   () => api.post('/auth/refresh'),
}

// ── QR Codes ──────────────────────────────────────────────────
export const qrAPI = {
  list:       (params) => api.get('/qr/', { params }),
  create:     (data) => api.post('/qr/', data),
  get:        (id) => api.get(`/qr/${id}`),
  update:     (id, data) => api.put(`/qr/${id}`, data),
  delete:     (id) => api.delete(`/qr/${id}`),
  analytics:  (id) => api.get(`/qr/${id}/analytics`),
  types:      () => api.get('/qr/types'),
  downloadImage: async (id, shortCode, size = 512) => {
    const res = await fetch(`/api/v1/qr/${id}/image?size=${size}`, {
      credentials: 'include',
    })
    if (!res.ok) throw new Error('Error descargando imagen')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `qr-${shortCode}.png`
    a.click()
    URL.revokeObjectURL(url)
  },
}

// ── Billing ───────────────────────────────────────────────────
export const billingAPI = {
  plans:          () => api.get('/billing/plans'),
  status:         () => api.get('/billing/status'),
  checkout:       (plan) => api.post('/billing/checkout', { plan }),
  renewFree:      () => api.post('/billing/renew-free'),
  customerPortal: () => api.post('/billing/customer-portal'),
  invoices:       () => api.get('/billing/invoices'),
}

// ── Campaigns ─────────────────────────────────────────────────
export const campaignsAPI = {
  list:       () => api.get('/campaigns/'),
  create:     (data) => api.post('/campaigns/', data),
  get:        (id) => api.get(`/campaigns/${id}`),
  update:     (id, data) => api.put(`/campaigns/${id}`, data),
  delete:     (id) => api.delete(`/campaigns/${id}`),
  assignQR:   (qrId, campaignId) =>
    api.post(`/campaigns/assign-qr/${qrId}`, { campaign_id: campaignId }),
}

export default api
