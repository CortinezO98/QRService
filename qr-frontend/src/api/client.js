/**
 * API client — Sprint 4
 * - Usa cookies HttpOnly con withCredentials.
 * - Soporta VITE_API_URL para despliegue y fallback relativo para Docker/Nginx.
 * - Maneja refresh en cola para evitar múltiples refresh simultáneos.
 */
import axios from 'axios'

const rawApiUrl = import.meta.env.VITE_API_URL || ''
const normalizedApiUrl = rawApiUrl.replace(/\/$/, '')
const baseURL = normalizedApiUrl ? `${normalizedApiUrl}/api/v1` : '/api/v1'

const api = axios.create({
  baseURL,
  timeout: 20000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

let isRefreshing = false
let failedQueue = []

const processQueue = (error) => {
  failedQueue.forEach((prom) => (error ? prom.reject(error) : prom.resolve()))
  failedQueue = []
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config || {}

    const shouldRefresh =
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/register')

    if (!shouldRefresh) return Promise.reject(error)

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      })
        .then(() => api(originalRequest))
        .catch((err) => Promise.reject(err))
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      await axios.post(`${baseURL}/auth/refresh`, {}, { withCredentials: true })
      processQueue(null)
      return api(originalRequest)
    } catch (refreshError) {
      processQueue(refreshError)
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  refresh: () => api.post('/auth/refresh'),
}

export const qrAPI = {
  list: (params) => api.get('/qr/', { params }),
  create: (data) => api.post('/qr/', data),
  get: (id) => api.get(`/qr/${id}`),
  update: (id, data) => api.put(`/qr/${id}`, data),
  delete: (id) => api.delete(`/qr/${id}`),
  analytics: (id) => api.get(`/qr/${id}/analytics`),
  types: () => api.get('/qr/types'),
  downloadImage: async (id, shortCode, size = 1024, format = 'png', transparent = false) => {
    const params = new URLSearchParams({
      size: String(size),
      format,
      transparent: String(transparent),
    })

    const url = `${baseURL}/qr/${id}/image?${params.toString()}`
    const res = await fetch(url, { credentials: 'include' })

    if (!res.ok) throw new Error('Error descargando imagen')

    const blob = await res.blob()
    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = `qr-${shortCode}.${format}`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(objectUrl)
  },
}

export const billingAPI = {
  plans: () => api.get('/billing/plans'),
  status: () => api.get('/billing/status'),
  checkout: (plan) => api.post('/billing/checkout', { plan }),
  renewFree: () => api.post('/billing/renew-free'),
  customerPortal: () => api.post('/billing/customer-portal'),
  invoices: () => api.get('/billing/invoices'),
}

export const campaignsAPI = {
  list: () => api.get('/campaigns/'),
  create: (data) => api.post('/campaigns/', data),
  get: (id) => api.get(`/campaigns/${id}`),
  update: (id, data) => api.put(`/campaigns/${id}`, data),
  delete: (id) => api.delete(`/campaigns/${id}`),
  assignQR: (qrId, campaignId) => api.post(`/campaigns/assign-qr/${qrId}`, { campaign_id: campaignId }),
}

export default api
