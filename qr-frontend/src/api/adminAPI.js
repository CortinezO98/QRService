/**
 * Admin API client — Sprint 5
 * Todos los endpoints requieren is_admin=true en el usuario.
 */
import api from './client'

export const adminAPI = {
  // Estadísticas globales
  stats: () => api.get('/admin/stats'),

  // Usuarios
  listUsers: (params = {}) => api.get('/admin/users', { params }),
  getUser: (id) => api.get(`/admin/users/${id}`),
  getUserQR: (id) => api.get(`/admin/users/${id}/qr-codes`),

  // Acciones sobre usuarios
  changePlan: (id, plan, days = 365) =>
    api.post(`/admin/users/${id}/change-plan`, { plan, days }),
  toggleAdmin: (id, is_admin) =>
    api.post(`/admin/users/${id}/toggle-admin`, { is_admin }),
  toggleActive: (id, is_active) =>
    api.post(`/admin/users/${id}/toggle-active`, { is_active }),
}
