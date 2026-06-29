/**
 * API Client — Axios con cookies HttpOnly
 * OWASP A02: Tokens NUNCA en localStorage.
 * El access_token viaja en cookie HttpOnly (seteada por el backend).
 * Para requests API usamos withCredentials: true.
 *
 * Sprint 1: Eliminado localStorage para tokens.
 *           Refresh via /auth/refresh (lee cookie automáticamente).
 */
import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
  withCredentials: true,  // Enviar cookies en cada request (incluyendo access_token)
})

// Estado para evitar múltiples refreshes simultáneos
let isRefreshing = false
let failedQueue = []

const processQueue = (error) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve()
    }
  })
  failedQueue = []
}

// Auto-refresh en 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config

    // Si es 401 y no es el endpoint de refresh ni de login
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/login')
    ) {
      if (isRefreshing) {
        // Encolar requests mientras se refresca
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(() => api(originalRequest))
          .catch(err => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        // El backend lee el refresh_token desde cookie HttpOnly
        await axios.post('/api/v1/auth/refresh', {}, { withCredentials: true })
        processQueue(null)
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError)
        // Refresh falló — limpiar estado local (no localStorage) y redirigir
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
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  refresh: () => api.post('/auth/refresh'),
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
  // Imagen: fetch directo con credentials
  imageUrl:   (id) => `/api/v1/qr/${id}/image`,
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

export default api
